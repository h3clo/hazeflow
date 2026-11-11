import Foundation
import WatchConnectivity

/// Shows the phone's latest primary-activity snapshot. It does not store records or schedule alerts.
final class HazeWatchModel: NSObject, ObservableObject {
    @Published private(set) var presentation: HazeWatchPresentation = .waiting
    private var message: HazeWatchMessage?
    private var reachable = false
    private var usesFixture = false

    override init() {
        super.init()
        #if DEBUG
        if applyFixture(ProcessInfo.processInfo.environment["HAZE_WATCH_FIXTURE"] ?? "") { return }
        #endif
        message = HazeWatchStore.load()
        refresh()
        HazeWatchPhoneSession.shared.start(model: self)
    }

    func apply(context: [String: Any], reachable: Bool) {
        guard !usesFixture else { return }
        if let message = hazeWatchMessage(from: context) {
            self.message = message
            HazeWatchStore.save(context)
        }
        self.reachable = reachable
        refresh()
    }

    func setReachable(_ reachable: Bool) {
        guard !usesFixture else { return }
        let becameReachable = reachable && !self.reachable
        self.reachable = reachable
        refresh()
        if becameReachable { requestSnapshot() }
    }

    func requestSnapshot() {
        guard !usesFixture else { return }
        HazeWatchPhoneSession.shared.requestSnapshot()
    }

    private func refresh() {
        presentation = hazeWatchPresentation(message: message, reachable: reachable)
    }

    #if DEBUG
    @discardableResult
    private func applyFixture(_ mode: String) -> Bool {
        let sent = Date(timeIntervalSince1970: 1_762_905_600)
        switch mode {
        case "live":
            message = HazeWatchMessage(active: true, title: "연습 활동", startedAt: sent.addingTimeInterval(-120), sentAt: sent)
            reachable = true
        case "empty":
            message = HazeWatchMessage(active: false, title: "", startedAt: nil, sentAt: sent)
            reachable = true
        case "stale":
            message = HazeWatchMessage(active: true, title: "연습 활동", startedAt: sent.addingTimeInterval(-600), sentAt: sent)
            reachable = false
        case "stale-empty":
            message = HazeWatchMessage(active: false, title: "", startedAt: nil, sentAt: sent)
            reachable = false
        default:
            return false
        }
        usesFixture = true
        refresh()
        return true
    }
    #endif
}

enum HazeWatchStore {
    private static let key = "haze-watch-last-phone-message"

    static func load() -> HazeWatchMessage? {
        guard let raw = UserDefaults.standard.dictionary(forKey: key) else { return nil }
        return hazeWatchMessage(from: raw)
    }

    static func save(_ context: [String: Any]) {
        var stored: [String: Any] = [:]
        for key in ["active", "title", "startedAt", "sentAt"] {
            if let value = context[key] { stored[key] = value }
        }
        UserDefaults.standard.set(stored, forKey: key)
    }
}

final class HazeWatchPhoneSession: NSObject, WCSessionDelegate {
    static let shared = HazeWatchPhoneSession()
    private weak var model: HazeWatchModel?

    func start(model: HazeWatchModel) {
        self.model = model
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        session.delegate = self
        session.activate()
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        let context = session.receivedApplicationContext
        DispatchQueue.main.async {
            self.model?.apply(context: context, reachable: session.isReachable)
            self.model?.requestSnapshot()
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        DispatchQueue.main.async {
            self.model?.apply(context: applicationContext, reachable: session.isReachable)
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.model?.setReachable(session.isReachable)
        }
    }

    func requestSnapshot() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        guard session.activationState == .activated, session.isReachable else { return }
        session.sendMessage(["request": "snapshot"], replyHandler: nil, errorHandler: { _ in })
    }
}
