import Foundation

/// The one primary activity the phone already chose. Watch does not pick another.
struct HazeWatchMessage: Equatable {
    var active: Bool
    var title: String
    var startedAt: Date?
    var sentAt: Date
    var phase: String
}

enum HazeWatchPresentation: Equatable {
    case waiting
    case checking
    case syncing
    case disconnected
    case empty
    case live(title: String, startedAt: Date)
    case staleActivity(title: String, elapsed: String, sentAt: Date)
    case staleEmpty(sentAt: Date)
}

enum HazeWatchDates {
    static func parse(_ value: String) -> Date? {
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: value) { return date }
        let basic = ISO8601DateFormatter()
        basic.formatOptions = [.withInternetDateTime]
        return basic.date(from: value)
    }

    static func string(_ date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.string(from: date)
    }
}

func hazeWatchMessage(from context: [String: Any]) -> HazeWatchMessage? {
    guard let sentAtText = context["sentAt"] as? String, let sentAt = HazeWatchDates.parse(sentAtText) else { return nil }
    let active = (context["active"] as? Bool) ?? (context["active"] as? NSNumber)?.boolValue ?? false
    let title = (context["title"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let startedAt = (context["startedAt"] as? String).flatMap(HazeWatchDates.parse)
    let phase = (context["phase"] as? String) == "pending" ? "pending" : "ready"
    return HazeWatchMessage(active: active, title: title, startedAt: startedAt, sentAt: sentAt, phase: phase)
}

func hazeWatchIsRefreshRequest(_ message: [String: Any]) -> Bool {
    (message["request"] as? String) == "snapshot"
}

func hazeWatchPresentation(message: HazeWatchMessage?, reachable: Bool) -> HazeWatchPresentation {
    guard let message else { return reachable ? .checking : .waiting }
    if message.phase == "pending" { return reachable ? .syncing : .disconnected }
    let live = message.active && !message.title.isEmpty && message.startedAt != nil
    if reachable {
        guard live, let startedAt = message.startedAt else { return .empty }
        return .live(title: message.title, startedAt: startedAt)
    }
    guard live, let startedAt = message.startedAt else { return .staleEmpty(sentAt: message.sentAt) }
    return .staleActivity(
        title: message.title,
        elapsed: hazeWatchFrozenElapsed(from: startedAt, to: message.sentAt),
        sentAt: message.sentAt
    )
}

func hazeWatchFrozenElapsed(from start: Date, to end: Date) -> String {
    let seconds = max(0, Int(end.timeIntervalSince(start)))
    let hours = seconds / 3600
    let minutes = (seconds % 3600) / 60
    if hours > 0 { return "\(hours)시간 \(minutes)분" }
    return "\(minutes)분"
}

func hazeWatchClock(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "ko_KR")
    formatter.timeZone = TimeZone.current
    formatter.dateFormat = "HH:mm"
    return formatter.string(from: date)
}

func hazeWatchStateLabel(_ presentation: HazeWatchPresentation) -> String {
    switch presentation {
    case .waiting: return "watch-state:waiting"
    case .checking: return "watch-state:checking"
    case .syncing: return "watch-state:syncing"
    case .disconnected: return "watch-state:disconnected"
    case .empty: return "watch-state:empty"
    case .live: return "watch-state:live"
    case .staleActivity: return "watch-state:stale"
    case .staleEmpty: return "watch-state:stale-empty"
    }
}
