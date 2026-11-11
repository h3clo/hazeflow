import XCTest

final class HazeWatchSnapshotTests: XCTestCase {
    func testConnectedPhoneShowsOnlyThePrimaryActivity() {
        let sent = Date(timeIntervalSince1970: 1_700_000_000)
        let message = HazeWatchMessage(active: true, title: "연습 활동", startedAt: sent.addingTimeInterval(-90), sentAt: sent, phase: "ready")
        let screen = hazeWatchPresentation(message: message, reachable: true)
        guard case .live(let title, _) = screen else { return XCTFail("\(screen)") }
        XCTAssertEqual(title, "연습 활동")
    }

    func testNoActivitySaysSo() {
        let sent = Date(timeIntervalSince1970: 1_700_000_000)
        let message = HazeWatchMessage(active: false, title: "", startedAt: nil, sentAt: sent, phase: "ready")
        XCTAssertEqual(hazeWatchPresentation(message: message, reachable: true), .empty)
        XCTAssertEqual(hazeWatchPresentation(message: nil, reachable: true), .checking)
        let pending = HazeWatchMessage(active: false, title: "연습 활동", startedAt: sent, sentAt: sent, phase: "pending")
        XCTAssertEqual(hazeWatchPresentation(message: pending, reachable: true), .syncing)
        XCTAssertEqual(hazeWatchPresentation(message: pending, reachable: false), .disconnected)
    }

    func testDisconnectedSnapshotDoesNotLookLive() {
        let sent = Date(timeIntervalSince1970: 1_700_000_000)
        let message = HazeWatchMessage(active: true, title: "연습 활동", startedAt: sent.addingTimeInterval(-600), sentAt: sent, phase: "ready")
        let screen = hazeWatchPresentation(message: message, reachable: false)
        guard case .staleActivity(let title, let elapsed, let sentAt) = screen else { return XCTFail("\(screen)") }
        XCTAssertEqual(title, "연습 활동")
        XCTAssertEqual(elapsed, "10분")
        XCTAssertEqual(sentAt, sent)
        XCTAssertEqual(hazeWatchPresentation(message: HazeWatchMessage(active: false, title: "", startedAt: nil, sentAt: sent, phase: "ready"), reachable: false), .staleEmpty(sentAt: sent))
        XCTAssertEqual(hazeWatchPresentation(message: nil, reachable: false), .waiting)
    }

    func testContextKeepsOneRecord() {
        let context: [String: Any] = [
            "active": true,
            "title": "연습 활동",
            "startedAt": "2026-11-12T00:00:00Z",
            "sentAt": "2026-11-12T00:10:00Z"
        ]
        let message = hazeWatchMessage(from: context)
        XCTAssertEqual(message?.title, "연습 활동")
        XCTAssertEqual(message?.active, true)
        XCTAssertEqual(hazeWatchFrozenElapsed(from: message!.startedAt!, to: message!.sentAt), "10분")
        XCTAssertEqual(message?.phase, "ready")
        XCTAssertTrue(hazeWatchIsRefreshRequest(["request": "snapshot"]))
        XCTAssertFalse(hazeWatchIsRefreshRequest(["request": "end"]))
        let waiting = hazeWatchMessage(from: ["active": false, "phase": "pending", "sentAt": "2026-11-12T00:10:00Z"])
        XCTAssertEqual(waiting?.phase, "pending")
        XCTAssertEqual(waiting?.title, "")
    }
}
