import XCTest

final class HazeWatchUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testLivePrimaryActivityShowsElapsedTimer() {
        let app = launch("live")
        XCTAssertTrue(app.staticTexts["연습 활동"].waitForExistence(timeout: 15), app.debugDescription)
        XCTAssertTrue(app.descendants(matching: .any)["watch-state:live"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["iPhone과 연결되지 않음"].exists)
    }

    func testNoActivityIsExplicit() {
        let app = launch("empty")
        XCTAssertTrue(app.staticTexts["진행 중인 활동 없음"].waitForExistence(timeout: 15), app.debugDescription)
        XCTAssertTrue(app.descendants(matching: .any)["watch-state:empty"].exists)
    }

    func testSyncPendingIsNotAnEmptyActivity() {
        let app = launch("pending")
        XCTAssertTrue(app.staticTexts["동기화 대기"].waitForExistence(timeout: 15), app.debugDescription)
        XCTAssertTrue(app.descendants(matching: .any)["watch-state:syncing"].exists)
        XCTAssertFalse(app.staticTexts["진행 중인 활동 없음"].exists)
        XCTAssertFalse(app.staticTexts["연습 활동"].exists)
    }

    func testDisconnectedPendingDoesNotKeepTheOldActivity() {
        let app = launch("pending-offline")
        XCTAssertTrue(app.staticTexts["iPhone과 연결되지 않음"].waitForExistence(timeout: 15), app.debugDescription)
        XCTAssertTrue(app.descendants(matching: .any)["watch-state:disconnected"].exists)
        XCTAssertFalse(app.staticTexts["진행 중인 활동 없음"].exists)
        XCTAssertFalse(app.staticTexts["연습 활동"].exists)
    }

    func testDisconnectedStateStaysLabeledAsLastSync() {
        let app = launch("stale")
        XCTAssertTrue(app.staticTexts["iPhone과 연결되지 않음"].waitForExistence(timeout: 15), app.debugDescription)
        XCTAssertTrue(app.staticTexts["연습 활동"].exists)
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS '마지막 확인' AND label CONTAINS '10분'")).firstMatch.exists)
        XCTAssertTrue(app.descendants(matching: .any)["watch-state:stale"].exists)
    }

    private func launch(_ fixture: String) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchEnvironment = ["HAZE_WATCH_FIXTURE": fixture]
        app.launch()
        return app
    }
}
