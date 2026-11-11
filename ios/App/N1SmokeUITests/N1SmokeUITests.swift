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

    /// Pinch zoom stays a device check. This covers the status-bar hit area, tab stability, and background return.
    func testTopButtonsStayTappableAndTabsStayDuringScroll() throws {
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.buttons["설정"].firstMatch.waitForExistence(timeout: 30), app.debugDescription)
        let settings = headerButton("설정", in: app)
        let listed = app.buttons.matching(NSPredicate(format: "label == %@", "설정"))
        var dump = ""
        for index in 0..<listed.count { dump += " [\(index)] \(listed.element(boundBy: index).frame)" }
        XCTAssertTrue(settings.isHittable, "상단 설정을 누를 수 없어요 \(settings.frame) all\(dump)")
        XCTAssertGreaterThan(settings.frame.minY, 24, "상단 버튼이 상태바 안에 있어요 \(settings.frame)")

        let tabY = bottomTab("기록", in: app).frame.minY
        app.swipeUp()
        XCTAssertEqual(bottomTab("기록", in: app).frame.minY, tabY, accuracy: 3, "스크롤 후 하단 탭이 움직였어요")
        app.swipeDown()
        let settingsAgain = headerButton("설정", in: app)
        XCTAssertTrue(settingsAgain.isHittable, "맨 위로 돌아와도 상단 버튼을 누를 수 없어요 \(settingsAgain.frame)")

        let theme = app.buttons["어두운 화면으로 전환"]
        if theme.waitForExistence(timeout: 3) { theme.tap() }
        XCTAssertTrue(headerButton("설정", in: app).isHittable)

        let field = app.textViews["지금 뭐 하고 있어?"]
        var attempts = 0
        while !field.exists && attempts < 4 {
            app.swipeUp()
            attempts += 1
        }
        if field.waitForExistence(timeout: 4) {
            field.tap()
            let keyboard = app.keyboards.firstMatch
            let done = app.buttons["Done"]
            XCTAssertTrue(keyboard.waitForExistence(timeout: 5) || done.waitForExistence(timeout: 2), "키보드가 나타나지 않았어요")
            if done.exists { done.tap() }
        }
        for _ in 0..<4 where !headerButton("설정", in: app).isHittable { app.swipeDown() }
        XCTAssertTrue(headerButton("설정", in: app).isHittable, "키보드를 닫고 맨 위로 돌아와도 상단 버튼을 누를 수 없어요")
        XCTAssertEqual(bottomTab("기록", in: app).frame.minY, tabY, accuracy: 8, "키보드를 닫은 뒤 하단 탭이 제자리로 오지 않았어요")

        XCUIDevice.shared.press(.home)
        app.activate()
        XCTAssertTrue(headerButton("설정", in: app).waitForExistence(timeout: 15))
        let returned = bottomTab("기록", in: app)
        XCTAssertGreaterThan(returned.frame.minY, app.frame.height * 0.55, "앱으로 돌아온 뒤 하단 탭이 아래로 있지 않아요 \(returned.frame) screen \(app.frame)")
    }

    private func bottomTab(_ label: String, in app: XCUIApplication) -> XCUIElement {
        let matches = app.buttons.matching(NSPredicate(format: "label == %@", label))
        var bottom = matches.element(boundBy: 0)
        for index in 1..<matches.count {
            let candidate = matches.element(boundBy: index)
            if candidate.frame.maxY > bottom.frame.maxY { bottom = candidate }
        }
        return bottom
    }

    private func headerButton(_ label: String, in app: XCUIApplication) -> XCUIElement {
        let matches = app.buttons.matching(NSPredicate(format: "label == %@", label))
        guard matches.count > 0 else { return matches.element(boundBy: 0) }
        var top = matches.element(boundBy: 0)
        for index in 1..<matches.count {
            let candidate = matches.element(boundBy: index)
            if candidate.frame.minY < top.frame.minY { top = candidate }
        }
        return top
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
