import ActivityKit
import SwiftUI
import WidgetKit

/// Lock-screen presentation. The dynamicIsland closure is required by ActivityKit.
/// It repeats the same title and system timer. There is no separate island layout.
@available(iOS 16.2, *)
struct HazeLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: HazeActivityAttributes.self) { context in
            VStack(alignment: .leading, spacing: 4) {
                Text(context.state.title)
                    .font(.headline)
                    .lineLimit(1)
                Text(timerInterval: context.state.startedAt...Date.distantFuture, countsDown: false)
                    .font(.title2.monospacedDigit())
                    .lineLimit(1)
                Text(context.state.kind)
                    .font(.caption)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.center) {
                    Text(context.state.title).lineLimit(1)
                }
            } compactLeading: {
                Text(context.state.title).lineLimit(1)
            } compactTrailing: {
                Text(timerInterval: context.state.startedAt...Date.distantFuture, countsDown: false)
                    .monospacedDigit()
                    .lineLimit(1)
            } minimal: {
                Text(String(context.state.title.prefix(1)))
            }
        }
    }
}

@available(iOS 16.2, *)
@main
struct HazeLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        HazeLiveActivityWidget()
    }
}
