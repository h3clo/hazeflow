import Capacitor
import Foundation
import UserNotifications

@objc(HazeLocalReminderPlugin)
public class HazeLocalReminderPlugin: CAPPlugin, CAPBridgedPlugin, NotificationHandlerProtocol {
    public let identifier = "HazeLocalReminderPlugin"
    public let jsName = "HazeLocalReminder"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "permission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "request", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pending", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "schedule", returnType: CAPPluginReturnPromise)
    ]

    override public func load() {
        bridge?.notificationRouter.localNotificationHandler = self
    }

    /// Foreground delivery stays in the in-app notice. Background delivery uses the system banner.
    public func willPresent(notification: UNNotification) -> UNNotificationPresentationOptions {
        return []
    }

    public func didReceive(response: UNNotificationResponse) {
        notifyListeners("action", data: ["extra": stringExtra(response.notification.request.content.userInfo["extra"])])
    }

    @objc func permission(_ call: CAPPluginCall) {
        Task {
            let settings = await UNUserNotificationCenter.current().notificationSettings()
            call.resolve(["display": Self.display(settings.authorizationStatus)])
        }
    }

    @objc func request(_ call: CAPPluginCall) {
        Task {
            let granted = (try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])) ?? false
            let settings = await UNUserNotificationCenter.current().notificationSettings()
            call.resolve(["display": granted ? Self.display(settings.authorizationStatus) : "denied"])
        }
    }

    @objc func pending(_ call: CAPPluginCall) {
        Task {
            let requests = await UNUserNotificationCenter.current().pendingNotificationRequests()
            let notifications: [[String: Any]] = requests.compactMap { request in
                guard let id = Int(request.identifier) else { return nil }
                return ["id": id, "extra": stringExtra(request.content.userInfo["extra"])]
            }
            call.resolve(["notifications": notifications])
        }
    }

    @objc func cancel(_ call: CAPPluginCall) {
        let ids = (call.getArray("ids") ?? []).compactMap { value -> String? in
            if let number = value as? NSNumber { return number.stringValue }
            if let text = value as? String { return text }
            return nil
        }
        Task {
            UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ids)
            call.resolve()
        }
    }

    @objc func schedule(_ call: CAPPluginCall) {
        let items = call.getArray("notifications", JSObject.self) ?? []
        Task {
            let center = UNUserNotificationCenter.current()
            for item in items {
                guard let id = item["id"] as? Int ?? (item["id"] as? NSNumber)?.intValue,
                      let title = item["title"] as? String,
                      let body = item["body"] as? String,
                      let at = item["at"] as? String,
                      let date = HazeLiveActivityDates.parse(at) else { continue }
                let interval = date.timeIntervalSinceNow
                guard interval >= 1 else { continue }
                let content = UNMutableNotificationContent()
                content.title = String(title.prefix(80))
                content.body = String(body.prefix(120))
                content.sound = .default
                content.userInfo = ["extra": stringMap(item["extra"] as? JSObject)]
                let trigger = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
                let request = UNNotificationRequest(identifier: String(id), content: content, trigger: trigger)
                try? await center.add(request)
            }
            call.resolve()
        }
    }

    private static func display(_ status: UNAuthorizationStatus) -> String {
        switch status {
        case .authorized, .provisional, .ephemeral: return "granted"
        case .denied: return "denied"
        default: return "prompt"
        }
    }
}

private func stringMap(_ value: JSObject?) -> [String: String] {
    guard let value else { return [:] }
    var extra: [String: String] = [:]
    for (key, raw) in value {
        if let text = raw as? String { extra[key] = text }
    }
    return extra
}

private func stringExtra(_ value: Any?) -> [String: String] {
    guard let value = value as? [String: Any] else { return [:] }
    var extra: [String: String] = [:]
    for (key, raw) in value {
        if let text = raw as? String { extra[key] = text }
    }
    return extra
}
