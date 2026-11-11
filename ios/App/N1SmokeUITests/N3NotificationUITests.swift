import XCTest

/// Default notifications stay off. A real banner is device-only and is not asserted here.
final class N3NotificationUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testLocalRemindersStayOffWithoutAPermissionPrompt() throws {
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.staticTexts["나의 하루"].waitForExistence(timeout: 30), app.debugDescription)
        let any = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'local-reminder:'")).firstMatch
        XCTAssertTrue(any.waitForExistence(timeout: 20), app.debugDescription)
        let deadline = Date().addingTimeInterval(8)
        var label = any.label
        let settled = NSPredicate(format: "label BEGINSWITH 'local-reminder:' AND NOT label BEGINSWITH 'local-reminder:checking'")
        while label.hasPrefix("local-reminder:checking") && Date() < deadline {
            let match = app.staticTexts.matching(settled).firstMatch
            if match.exists {
                label = match.label
                break
            }
            RunLoop.current.run(until: Date().addingTimeInterval(0.2))
        }
        XCTAssertFalse(label.hasPrefix("local-reminder:checking"), label)
        XCTAssertFalse(label.contains("scheduled"), label)
        XCTAssertTrue(label.hasPrefix("local-reminder:cleared:"), label)
        XCTAssertFalse(app.alerts.firstMatch.exists)
    }
}
