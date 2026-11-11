import XCTest

/// N1 shell smoke: existing web UI in the Capacitor simulator.
/// Does not sign in, does not write Supabase, and does not cover Live Activities or Watch.
final class N1SmokeUITests: XCTestCase {
    private let marker = "N1simcheck"

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testShellScreensCaptureAndLocalPersistence() throws {
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.staticTexts["나의 하루"].waitForExistence(timeout: 30))

        // On the phone the date control also says “오늘”, so the tab is the last match.
        openTab("계획", heading: "캘린더", in: app)
        openTab("기록", heading: "활동 기록", in: app)
        openTab("돈 관리", heading: "가계부", in: app)
        openTab("돌아보기", heading: "주간 회고", in: app)
        openTab("오늘", heading: "나의 하루", in: app)

        let login = app.buttons["로그인"].firstMatch
        XCTAssertTrue(login.waitForExistence(timeout: 10))
        login.tap()
        let email = app.textFields["you@example.com"]
        let emailLabel = app.textFields["이메일"]
        XCTAssertTrue(email.waitForExistence(timeout: 10) || emailLabel.exists, app.debugDescription)

        app.terminate()
        app.launch()
        XCTAssertTrue(app.staticTexts["나의 하루"].waitForExistence(timeout: 30))

        tapFirst(["＋ 활동 기록", "＋ 빠른 기록", "+ 활동 기록"], in: app)
        let field = app.textViews["지금 뭐 하고 있어?"]
        XCTAssertTrue(field.waitForExistence(timeout: 10), app.debugDescription)
        field.tap()
        field.typeText(marker)
        let done = app.buttons["Done"]
        if done.waitForExistence(timeout: 2) { done.tap() }
        tapFirst(["짧은 기록 저장", "활동 시작"], in: app)

        let saved = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", marker)).firstMatch
        XCTAssertTrue(saved.waitForExistence(timeout: 15), app.debugDescription)

        app.terminate()
        app.launch()
        let kept = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", marker)).firstMatch
        XCTAssertTrue(kept.waitForExistence(timeout: 30), "활동 기록이 재실행 후 보이지 않아요")
    }

    private func openTab(_ label: String, heading: String, in app: XCUIApplication) {
        let matches = app.buttons.matching(NSPredicate(format: "label == %@", label))
        XCTAssertTrue(matches.firstMatch.waitForExistence(timeout: 8), "탭 \(label)이 없어요")
        matches.element(boundBy: matches.count - 1).tap()
        XCTAssertTrue(app.staticTexts[heading].waitForExistence(timeout: 12), "\(label) 화면에서 \(heading)을 찾지 못했어요\n\(app.debugDescription)")
    }

    private func tapFirst(_ labels: [String], in app: XCUIApplication) {
        let deadline = Date().addingTimeInterval(12)
        while Date() < deadline {
            for label in labels {
                let button = app.buttons[label].firstMatch
                if button.exists && button.isHittable {
                    button.tap()
                    return
                }
            }
            app.swipeUp()
        }
        XCTFail("버튼을 찾지 못했어요: \(labels.joined(separator: ", "))\n\(app.debugDescription)")
    }
}
