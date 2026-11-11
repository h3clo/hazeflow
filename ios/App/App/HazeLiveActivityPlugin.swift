import ActivityKit
import Capacitor
import Foundation

struct HazeLivePayload: Equatable {
    var recordId: String
    var title: String
    var kind: String
    var startedAt: Date
}

enum HazeLiveActivityDates {
    static func parse(_ value: String) -> Date? {
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: value) { return date }
        let basic = ISO8601DateFormatter()
        basic.formatOptions = [.withInternetDateTime]
        return basic.date(from: value)
    }
}

/// Serializes start, update, and end so an older call cannot recreate an activity.
actor HazeLiveActivityGate {
    private var tail: Task<String, Never> = Task { "idle" }

    func enqueue(_ payload: HazeLivePayload?) -> Task<String, Never> {
        let previous = tail
        let task = Task { () -> String in
            _ = await previous.value
            return await HazeLiveActivityController.apply(payload)
        }
        tail = task
        return task
    }
}

enum HazeLiveActivityController {
    static func apply(_ payload: HazeLivePayload?) async -> String {
        guard #available(iOS 16.2, *) else { return "unsupported" }
        return await HazeLiveActivityRuntime.apply(payload)
    }
}

@available(iOS 16.2, *)
enum HazeLiveActivityRuntime {
    static func apply(_ payload: HazeLivePayload?) async -> String {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return "unsupported" }
        let activities = Activity<HazeActivityAttributes>.activities
        guard let payload else {
            for activity in activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            return activities.isEmpty ? "unchanged" : "ended"
        }
        let state = HazeActivityAttributes.ContentState(
            recordId: payload.recordId,
            title: payload.title,
            kind: payload.kind,
            startedAt: payload.startedAt
        )
        let content = ActivityContent(state: state, staleDate: nil)
        if let current = activities.first {
            let same = current.content.state == state && activities.count == 1
            if !same {
                await current.update(content)
            }
            for extra in activities.dropFirst() {
                await extra.end(nil, dismissalPolicy: .immediate)
            }
            return same ? "unchanged" : "updated"
        }
        do {
            _ = try Activity.request(
                attributes: HazeActivityAttributes(slot: "primary"),
                content: content,
                pushType: nil
            )
            return "started"
        } catch {
            return "unsupported"
        }
    }
}

@objc(HazeLiveActivityPlugin)
public class HazeLiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HazeLiveActivityPlugin"
    public let jsName = "HazeLiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise)
    ]
    private let gate = HazeLiveActivityGate()

    @objc func sync(_ call: CAPPluginCall) {
        let payload = payload(from: call)
        if call.getString("recordId") != nil && payload == nil && call.getBool("end") != true {
            call.resolve(["status": "unsupported", "recordId": "none"])
            return
        }
        Task {
            let task = await gate.enqueue(payload)
            let status = await task.value
            call.resolve(["status": status, "recordId": payload?.recordId ?? "none"])
        }
    }

    private func payload(from call: CAPPluginCall) -> HazeLivePayload? {
        if call.getBool("end") == true { return nil }
        guard let recordId = call.getString("recordId"), !recordId.isEmpty,
              let title = call.getString("title"), !title.isEmpty,
              let kind = call.getString("kind"), !kind.isEmpty,
              let startedAt = call.getString("startedAt"),
              let date = HazeLiveActivityDates.parse(startedAt) else { return nil }
        return HazeLivePayload(
            recordId: String(recordId.prefix(200)),
            title: String(title.prefix(80)),
            kind: String(kind.prefix(20)),
            startedAt: date
        )
    }
}
