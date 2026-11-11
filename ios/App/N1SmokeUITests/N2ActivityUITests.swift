import XCTest

/// The capture field sits under the bottom tabs, and XCUITest does not scroll that inner page.
/// This checks the native sync status after launch. Lock-screen layout stays a device check.
final class N2ActivityUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testLiveActivityStatusIsReportedOnLaunch() throws {
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.staticTexts["나의 하루"].waitForExistence(timeout: 30), app.debugDescription)
        let status = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "live-activity:")).firstMatch
        XCTAssertTrue(status.waitForExistence(timeout: 15), "Live Activity 동기화 상태가 없어요")
        XCTAssertFalse(status.label.contains("unsupported"), status.label)
        XCTAssertTrue(
            status.label.contains("started") || status.label.contains("updated") || status.label.contains("unchanged") || status.label.contains("ended"),
            status.label
        )
    }
}
