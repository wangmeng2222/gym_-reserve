const { app, BrowserWindow } = require('electron')
const log = require('electron-log');
const nodemailer = require('nodemailer');

log.transports.console.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

var receiverEmailAddress = [
    'qiu.siyuan92@gmail.com',
    'lshpeter960508@163.com'
  ];
var senderEmailAddress = 'kyoto.gym.check@gmail.com';
var senderEmailPassword = '';

var transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // SSL
  auth: {
    user: senderEmailAddress,
    pass: senderEmailPassword
  }
});
var mailOptions = {
  from: senderEmailAddress,
  to: receiverEmailAddress,
  subject: '体育館の空き状況（バドミントン）',
  text: '空き枠あり'
};
var gymList = [
    {
        name: "左京地域体育館",
        location: "京都市左京区",
        group: "26103",
        kaikan: "100073"
    },
    {
        name: "宝が池公園",
        location: "京都市左京区",
        group: "26103",
        kaikan: "100045"
    },
    {
        name: "東山地域体育館",
        location: "京都市東山区",
        group: "26105",
        kaikan: "100067"
    },
    {
        name: "桂川地域体育館",
        location: "京都市西京区",
        group: "26111",
        kaikan: "100069"
    }
]

let siteUrl = "https://g-kyoto.pref.kyoto.lg.jp/reserve_j/Core_i/init.asp?SBT=1&Target=_Top&LCD=";
var interval = 10 *  60 * 1000; 

function createWindow () {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            webviewTag: true
        }
    })
  
    //win.loadFile('index.html');

    let gym = gymList[0];

    function next(res) {
        let index = gymList.findIndex(x => x.name === gym.name);
        gym.availability = res;
        if(index < gymList.length - 1) {
            gym = gymList[++index];
            win.loadURL(siteUrl);
        } else {
                let text = "";
                let crlf = "\r\n";
                let available = false;
                for(g of gymList) {
                    text += g.name + crlf;
                    console.log(g.availability);
                    for(s of g.availability) {
                        text += "\t" + s + ": 空き枠あり" + crlf;
                        available = true;
                    }   
                }
                if(available && mailOptions.text != text) {
                    mailOptions.text = text;
                    transporter.sendMail(mailOptions, function(error, info){
                        if (error) {
                          log.error('送信失敗: ' + error);
                        } else {
                          log.info('送信成功: ' + info.response);
                        }
                        log.info('終了');
                    });
                } else {
                    log.info('予約状況はまだ更新していません。');
                    log.info('完了');
                }
            
        }
    }

    let timeout = 2000;

    const browserView = win.webContents;
    //browserView.openDevTools();
    browserView.on('dom-ready', () => {
        let frameUrl = "https://g-kyoto.pref.kyoto.lg.jp/reserve_j/Core_i/index.asp?cmd=init";
        let badmintonUrl = "https://g-kyoto.pref.kyoto.lg.jp/reserve_j/Core_i/i-62.asp?txt_sel_bunrui1_cd=100055&txt_sel_bunrui1_name=%83o%83h%83~%83%93%83g%83%93&Search=Mokuteki";
        let searchUrl = "https://g-kyoto.pref.kyoto.lg.jp/reserve_j/Core_i/i-64.asp";
        let gymUrl = `https://g-kyoto.pref.kyoto.lg.jp/reserve_j/Core_i/i-1-21.asp?group=${gym.group}&kaikan=${gym.kaikan}`;
        let scheduleUrl1Day = "https://g-kyoto.pref.kyoto.lg.jp/reserve_j/Core_i/i-1-21.asp";
        let scheduleUrl2Week = "https://g-kyoto.pref.kyoto.lg.jp/reserve_j/Core_i/i-1-2.asp";

        let currentUrl = browserView.getURL();
        if(browserView.getURL() == siteUrl) {//初期ページ
            log.info(`${gym.name}の空き状況確認を開始`);
            browserView.loadURL(frameUrl);
        };
        if(currentUrl == frameUrl) {//frameページ
            setTimeout(function() {
                log.info("バドミントンを選択");
                browserView.executeJavaScript(`
                    let elements = document.querySelectorAll(".mokuteki_frame_sport > a");
                    [...elements].filter(a => a.textContent.includes("バドミントン")).forEach(a => a.click())
                `, true);
            }, timeout);
        };
        if(currentUrl == badmintonUrl) {//バドミントン選択後、左京市にある体育館の検索ページ
            setTimeout(function() {
                log.info(`${gym.location}の体育館を検索`);
                browserView.executeJavaScript(`
                    let elements = document.querySelectorAll("a");
                    [...elements].filter(a => a.textContent.includes("${gym.location}")).forEach(a => a.click())
                    setTimeout(function(){
                        var elements=document.querySelectorAll("input");
                        [...elements].filter(a => a.getAttribute('alt') == "検索実行").forEach(a => a.click())
                    }, 1000)
                `, true);
            }, timeout);
        };
        if(currentUrl == searchUrl) {//左京市にある体育館のリスト
            setTimeout(function() {
                log.info(`${gym.name}を選択`);
                browserView.executeJavaScript(`
                    let elements = document.querySelectorAll("input");
                    [...elements].filter(a => a.getAttribute('onclick') == "cmdYoyaku_click('${gym.kaikan}','${gym.group}');return false;").forEach(a => a.click())
                `, true);
            }, timeout);
        };
        if(currentUrl == gymUrl) {//2週間表示を選択
            setTimeout(function() {
                log.info("2週間表示モードで表示");
                browserView.executeJavaScript(`
                    let frmMe = window.document.form1;

                    frmMe.disp_mode[0].checked = true;
                    frmMe.disp_mode[1].checked = false;
                    selectedOpt = 0;
                    Document_Done = false;
                    frmMe.action = "i-1-2.asp";
                    frmMe.txtSelKomaPtnNo.value = "";
                    frmMe.cmd.value = "d_change";
                    frmMe.txt_yoyaku.value = "";
                    frmMe.method = "post";
                    
                    frmMe.submit();
                `, true);
            }, timeout);
        };
        if(currentUrl == scheduleUrl1Day) {//1日表示ページ
            
        };
        if(currentUrl == scheduleUrl2Week) {//2週間表示ページ
            log.info("空き状況を確認");
            browserView.executeJavaScript(`
                let elements = document.querySelectorAll(".right_disp .list img");
                let result = [];
                [...elements].filter(a => a.getAttribute('alt') == "予約可能")
                    .forEach(a => {    
                        result.push(a.parentNode.parentNode.parentNode.firstChild.textContent)
                    });
                result;
            `, true).then( (result) => {
                let nodup = [...new Set(result)];
                log.info(`${gym.name}の空き状況確認が完了: ` + nodup);
                next(nodup);
            })
        };
    });   
    
    function load() {
        log.info("開始");
        gym = gymList[0];
        win.loadURL(siteUrl);
    }
    load();
    setInterval(load, interval);
    browserView.show
}

  app.whenReady().then(() => {
    createWindow()
  
    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })