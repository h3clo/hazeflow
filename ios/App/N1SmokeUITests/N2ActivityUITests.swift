import XCTest

/// Drives the real capture form inside the web view. Lock-screen pixels stay unverified.
final class N2ActivityUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testLiveActivityStatusIsReportedOnLaunch() throws {
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.staticTexts["나의 하루"].waitForExistence(timeout: 30), app.debugDescription)
        let label = try waitForStatus(in: app)
        XCTAssertFalse(label.contains("unsupported"), label)
        XCTAssertTrue(
            label.contains("started") || label.contains("updated") || label.contains("unchanged") || label.contains("ended"),
            label
        )
    }

    func testOneLiveActivityRestoresAfterRelaunch() throws {
        let app = XCUIApplication()
        app.launchEnvironment = ["HAZE_N2_FIXTURE": "keep"]
        app.launch()
        XCTAssertTrue(app.staticTexts["n2-fixture:keep-done"].waitForExistence(timeout: 45), app.debugDescription)
        let first = try waitForStatus(in: app)
        let recordId = try recordId(from: first)
        XCTAssertTrue(first.hasSuffix(":1"), first)

        app.terminate()
        let again = XCUIApplication()
        again.launch()
        XCTAssertTrue(again.staticTexts["나의 하루"].waitForExistence(timeout: 30))
        let restored = try waitForStatus(in: again, timeout: 20)
        XCTAssertTrue(restored.contains(recordId), restored)
        XCTAssertTrue(restored.hasSuffix(":1"), restored)
        XCTAssertFalse(restored.contains("unsupported"), restored)
    }

    func testPrimarySwitchAndEndLeaveNoLiveActivity() throws {
        let app = XCUIApplication()
        app.launchEnvironment = ["HAZE_N2_FIXTURE": "cycle"]
        app.launch()
        let done = app.staticTexts["n2-fixture:cycle-done"]
        let failed = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "n2-fixture:failed")).firstMatch
        XCTAssertTrue(done.waitForExistence(timeout: 60) || failed.exists, app.debugDescription)
        XCTAssertFalse(failed.exists, failed.exists ? failed.label : app.debugDescription)
        XCTAssertTrue(app.staticTexts["N2cycleAlpha"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["N2cycleBeta"].exists)
        let label = try waitForStatus(in: app)
        XCTAssertTrue(label.hasSuffix(":0"), label)
        XCTAssertTrue(label.contains("ended") || label.contains("unchanged"), label)
        XCTAssertFalse(app.buttons["■ 끝내기"].exists)
    }

    private func waitForStatus(in app: XCUIApplication, timeout: TimeInterval = 15) throws -> String {
        let status = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "live-activity:")).firstMatch
        XCTAssertTrue(status.waitForExistence(timeout: timeout), "Live Activity 동기화 상태가 없어요")
        return status.label
    }

    private func recordId(from label: String) throws -> String {
        let parts = label.split(separator: ":").map(String.init)
        XCTAssertGreaterThanOrEqual(parts.count, 4, label)
        return parts[2]
    }
}
