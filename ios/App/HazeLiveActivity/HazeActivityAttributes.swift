import ActivityKit
import Foundation

/// One slot for the primary ongoing activity. The record itself stays in the web app.
@available(iOS 16.2, *)
struct HazeActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var recordId: String
        var title: String
        var kind: String
        var startedAt: Date
    }

    var slot: String
}
