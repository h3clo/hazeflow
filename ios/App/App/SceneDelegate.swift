import UIKit
import Capacitor

/// Hides the iOS 26 scroll-edge line so the status bar sits on the page background.
class HazeBridgeViewController: CAPBridgeViewController {
    private var watchesKeyboard = false

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(HazeLiveActivityPlugin())
        bridge?.registerPluginInstance(HazeLocalReminderPlugin())
        HazeWatchRelay.shared.start()
        hideScrollEdgeLine()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        hideScrollEdgeLine()
        #if DEBUG
        scheduleN2FixtureIfRequested()
        #endif
        guard !watchesKeyboard else { return }
        watchesKeyboard = true
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardDidHide), name: UIResponder.keyboardDidHideNotification, object: nil)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        hideScrollEdgeLine()
        // The page scrolls inside main. Leaving the web view scroller on eats those drags.
        webView?.scrollView.isScrollEnabled = false
    }

    #if DEBUG
    private var startedN2Fixture = false

    func scheduleN2FixtureIfRequested() {
        guard !startedN2Fixture else { return }
        let mode = ProcessInfo.processInfo.environment["HAZE_N2_FIXTURE"] ?? ""
        guard mode == "keep" || mode == "cycle" else { return }
        startedN2Fixture = true
        let script = HazeN2Fixture.script(mode: mode)
        var ticks = 0
        Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] timer in
            ticks += 1
            guard let webView = self?.webView else {
                if ticks > 40 { timer.invalidate() }
                return
            }
            if ticks > 40 {
                timer.invalidate()
                webView.evaluateJavaScript("var node=document.getElementById('live-activity-status');if(node)node.textContent='n2-fixture:failed:timeout'")
                return
            }
            webView.evaluateJavaScript("document.querySelector('#capture-text')?'ready':'wait'") { result, _ in
                guard result as? String == "ready" else { return }
                timer.invalidate()
                webView.evaluateJavaScript(script)
            }
        }
    }
    #endif

    @objc private func keyboardDidHide() {
        guard let webView else { return }
        webView.scrollView.contentInset = .zero
        webView.scrollView.verticalScrollIndicatorInsets = .zero
        additionalSafeAreaInsets = .zero
        if webView.frame != view.bounds {
            webView.frame = view.bounds
        }
    }

    private func hideScrollEdgeLine() {
        if #available(iOS 26.0, *) {
            webView?.scrollView.topEdgeEffect.isHidden = true
            webView?.scrollView.bottomEdgeEffect.isHidden = true
        }
    }
}

#if DEBUG
enum HazeN2Fixture {
    static func script(mode: String) -> String {
        let script = #"""
        (function(){
          if(window.__hazeN2) return 'busy';
          window.__hazeN2=true;
          const mode='__HAZE_N2_MODE__';
          const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
          const waitFor=async(pred,ms)=>{const end=Date.now()+ms;while(Date.now()<end){if(pred())return true;await sleep(200)}return false};
          const mark=(text)=>{let node=document.getElementById('n2-fixture-status');if(!node){node=document.createElement('p');node.id='n2-fixture-status';node.className='visually-hidden';document.body.appendChild(node)}node.textContent=text};
          const start=async(text)=>{
            if(!(await waitFor(()=>document.querySelector('#capture-text'),20000))) throw new Error('field');
            const field=document.querySelector('#capture-text');
            field.focus();
            field.value=text;
            field.dispatchEvent(new Event('input',{bubbles:true}));
            document.querySelector('[data-form=capture]').requestSubmit();
            if(await waitFor(()=>document.querySelector('[data-form=capture-ongoing-confirm] button.primary'),2500)){
              document.querySelector('[data-form=capture-ongoing-confirm] button.primary').click();
            }
            if(!(await waitFor(()=>(document.querySelector('#capture-text')?.value||'')!==text,15000))) throw new Error('save');
          };
          (async()=>{
            try{
              if(!(await waitFor(()=>document.querySelector('h1')?.textContent==='나의 하루',20000))) throw new Error('boot');
              if(mode==='keep'){
                await start('N2restore');
                if(!(await waitFor(()=>(document.getElementById('live-activity-status')?.textContent||'').endsWith(':1'),15000))) throw new Error('slot');
                mark('n2-fixture:keep-done');
                return;
              }
              await start('N2cycleAlpha');
              await start('N2cycleBeta');
              const switcher=document.querySelector('[data-act=set-primary-activity]');
              const nextId=switcher?.getAttribute('data-id');
              if(!switcher||!nextId) throw new Error('switch');
              switcher.click();
              if(!(await waitFor(()=>document.querySelector('.ongoing-finish-bar [data-act=finish-activity]')?.getAttribute('data-id')===nextId,10000))) throw new Error('primary');
              for(let guard=0;guard<4;guard++){
                const button=document.querySelector('[data-act=finish-activity]');
                if(!button) break;
                const id=button.getAttribute('data-id');
                button.click();
                await waitFor(()=>!document.querySelector('[data-act=finish-activity][data-id="'+id+'"]'),10000);
              }
              if(document.querySelector('[data-act=finish-activity]')) throw new Error('end');
              if(!(await waitFor(()=>{const label=document.getElementById('live-activity-status')?.textContent||'';return label.endsWith(':0')&&(label.includes('ended')||label.includes('unchanged'))},15000))) throw new Error('empty');
              mark('n2-fixture:cycle-done');
            }catch(error){mark('n2-fixture:failed:'+String(error&&error.message||error))}
          })();
          return 'started';
        })()
        """#
        return script.replacingOccurrences(of: "__HAZE_N2_MODE__", with: mode)
    }
}
#endif

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = HazeBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
