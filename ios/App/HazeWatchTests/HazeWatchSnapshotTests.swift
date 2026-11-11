import XCTest

final class HazeWatchSnapshotTests: XCTestCase {
    func testConnectedPhoneShowsOnlyThePrimaryActivity() {
        let sent = Date(timeIntervalSince1970: 1_700_000_000)
        let message = HazeWatchMessage(active: true, title: "연습 활동", startedAt: sent.addingTimeInterval(-90), sentAt: sent)
        let screen = hazeWatchPresentation(message: message, reachable: true)
        guard case .live(let title, _) = screen else { return XCTFail("\(screen)") }
        XCTAssertEqual(title, "연습 활동")
    }

    func testNoActivitySaysSo() {
        let message = HazeWatchMessage(active: false, title: "", startedAt: nil, sentAt: Date(timeIntervalSince1970: 1_700_000_000))
        XCTAssertEqual(hazeWatchPresentation(message: message, reachable: true), .empty)
        XCTAssertEqual(hazeWatchPresentation(message: nil, reachable: true), .checking)
    }

    func testDisconnectedSnapshotDoesNotLookLive() {
        let sent = Date(timeIntervalSince1970: 1_700_000_000)
        let message = HazeWatchMessage(active: true, title: "연습 활동", startedAt: sent.addingTimeInterval(-600), sentAt: sent)
        let screen = hazeWatchPresentation(message: message, reachable: false)
        guard case .staleActivity(let title, let elapsed, let sentAt) = screen else { return XCTFail("\(screen)") }
        XCTAssertEqual(title, "연습 활동")
        XCTAssertEqual(elapsed, "10분")
        XCTAssertEqual(sentAt, sent)
        XCTAssertEqual(hazeWatchPresentation(message: HazeWatchMessage(active: false, title: "", startedAt: nil, sentAt: sent), reachable: false), .staleEmpty(sentAt: sent))
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
        XCTAssertTrue(hazeWatchIsRefreshRequest(["request": "snapshot"]))
        XCTAssertFalse(hazeWatchIsRefreshRequest(["request": "end"]))
    }
}
