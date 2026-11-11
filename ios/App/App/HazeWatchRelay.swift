import Foundation
import WatchConnectivity

/// Forwards the phone's one Live Activity payload. Watch does not schedule notifications.
final class HazeWatchRelay: NSObject, WCSessionDelegate {
    static let shared = HazeWatchRelay()
    var onRefreshRequest: (() -> Void)?
    private var latest: [String: Any]?

    func start() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        if session.delegate == nil { session.delegate = self }
        session.activate()
    }

    func publish(_ payload: HazeLivePayload?, phase: String = "ready") {
        var context: [String: Any] = [
            "sentAt": HazeWatchDates.string(Date()),
            "active": false,
            "phase": phase == "pending" ? "pending" : "ready"
        ]
        if phase != "pending", let payload {
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

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        guard hazeWatchIsRefreshRequest(message) else { return }
        DispatchQueue.main.async { self.onRefreshRequest?() }
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }
}
