import Foundation
import WatchConnectivity

/// Forwards the phone's one Live Activity payload. Watch does not schedule notifications.
final class HazeWatchRelay: NSObject, WCSessionDelegate {
    static let shared = HazeWatchRelay()
    private var latest: [String: Any]?

    func start() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        if session.delegate == nil { session.delegate = self }
        session.activate()
    }

    func publish(_ payload: HazeLivePayload?) {
        var context: [String: Any] = [
            "sentAt": HazeWatchDates.string(Date()),
            "active": false
        ]
        if let payload {
            context["active"] = true
            context["recordId"] = payload.recordId
            context["title"] = payload.title
            context["startedAt"] = HazeWatchDates.string(payload.startedAt)
        }
        latest = context
        send()
    }

    private func send() {
        guard WCSession.isSupported(), let latest else { return }
        let session = WCSession.default
        guard session.activationState == .activated else { return }
        try? session.updateApplicationContext(latest)
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        send()
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }
}
