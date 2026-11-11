import SwiftUI

struct HazeWatchView: View {
    @ObservedObject var model: HazeWatchModel

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            switch model.presentation {
            case .waiting:
                Text("iPhone과 연결되지 않음")
                Text("아직 확인한 활동이 없어요")
                    .font(.footnote)
            case .checking:
                Text("iPhone에서 활동을 확인하고 있어요")
                    .font(.footnote)
            case .syncing:
                Text("동기화 대기")
            case .disconnected:
                Text("iPhone과 연결되지 않음")
                Text("연결되면 계정 활동을 다시 맞춥니다")
                    .font(.footnote)
            case .empty:
                Text("진행 중인 활동 없음")
            case .live(let title, let startedAt):
                Text(title)
                    .font(.headline)
                Text(timerInterval: startedAt...Date.distantFuture, countsDown: false)
                    .font(.title3.monospacedDigit())
            case .staleActivity(let title, let elapsed, let sentAt):
                Text("iPhone과 연결되지 않음")
                    .font(.footnote)
                Text(title)
                    .font(.headline)
                Text("마지막 확인 \(hazeWatchClock(sentAt)) · \(elapsed)")
                Text("연결되면 다시 맞춥니다")
                    .font(.footnote)
            case .staleEmpty(let sentAt):
                Text("iPhone과 연결되지 않음")
                Text("마지막 확인 \(hazeWatchClock(sentAt))에는 진행 중인 활동이 없었어요")
                    .font(.footnote)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .accessibilityIdentifier(hazeWatchStateLabel(model.presentation))
    }
}
