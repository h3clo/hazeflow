import SwiftUI

@main
struct HazeWatchApp: App {
    @StateObject private var model = HazeWatchModel()

    var body: some Scene {
        WindowGroup {
            HazeWatchView(model: model)
                .onAppear { model.requestSnapshot() }
        }
    }
}
