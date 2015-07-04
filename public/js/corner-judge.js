!function t(e,n,i){function o(s,a){if(!n[s]){if(!e[s]){var c="function"==typeof require&&require;if(!a&&c)return c(s,!0);if(r)return r(s,!0);var l=new Error("Cannot find module '"+s+"'");throw l.code="MODULE_NOT_FOUND",l}var u=n[s]={exports:{}};e[s][0].call(u.exports,function(t){var n=e[s][1][t];return o(n?n:t)},u,u.exports,t,e,n,i)}return n[s].exports}for(var r="function"==typeof require&&require,s=0;s<i.length;s++)o(i[s]);return o}({1:[function(t,e,n){"use strict";var i=t("fastclick").FastClick,o=t("../shared/io").IO,r=t("../shared/helpers"),s=t("../shared/login-view").LoginView,a=t("../shared/ring-list-view").RingListView,c=t("./round-view").RoundView,l=new o("cornerJudge");i.attach(document.body);var u=null,d={loginView:new s(l),ringListView:new a(l),authorisationView:{root:document.getElementById("authorisation")},roundView:new c(l)};r.subscribeToEvents(l,"root",["showView"],{showView:function(t){u&&u.root.classList.add("hidden"),u=d[t.view],u.root.classList.remove("hidden")}})},{"../shared/helpers":5,"../shared/io":6,"../shared/login-view":7,"../shared/ring-list-view":8,"./round-view":2,fastclick:10}],2:[function(t,e,n){"use strict";function i(t){this.io=t,this.root=document.getElementById("round"),this.undoBtn=this.root.querySelector(".undo-btn"),this.undoBtn.addEventListener("click",this.onUndoBtn.bind(this));var e="ontouchstart"in document.documentElement?"touchstart":"click",n=this.root.querySelector(".score-btns--hong"),i=this.root.querySelector(".score-btns--chong");n.addEventListener(e,this.onScoreBtnsDeletage.bind(this,"hong")),i.addEventListener(e,this.onScoreBtnsDeletage.bind(this,"chong")),document.addEventListener("transitionend",this.onTransitionEnd.bind(this)),this.feedback=this.root.querySelector(".feedback"),this.fdb=document.createElement("div"),this.fdb.className="fdb",o.subscribeToEvents(t,"roundView",["enableUndoBtn","showFdb"],this),this.feedback.appendChild(this.fdb);var r=window.getComputedStyle(this.fdb).getPropertyValue("transform");this.has3d=r&&"none"!==r,this.has3d||this.feedback.classList.add("no3d")}var o=t("../shared/helpers");i.prototype.enableUndoBtn=function(t){o.enableBtn(this.undoBtn,t.enable)},i.prototype.showFdb=function(t){var e=this.fdb.cloneNode();e.classList.add.apply(e.classList,["fdb--"+t.score.competitor,t.isUndo?"fdb--undo":t.score.competitor+"-bg"]),e.textContent=t.score.points,this.feedback.appendChild(e),window.navigator.vibrate&&window.navigator.vibrate(100),setTimeout(function(){var t=window.innerHeight+e.offsetHeight;this.has3d?e.style.transform="translate3d(0, "+t+"px, 0)":e.style.top=t+"px"}.bind(this),0)},i.prototype.onScoreBtnsDeletage=function(t,e){var n=e.target;n&&"BUTTON"===n.nodeName&&(n.blur(),this.io.send("score",{competitor:t,points:parseInt(n.textContent,10)}))},i.prototype.onUndoBtn=function(){this.undoBtn.blur(),this.io.send("undo")},i.prototype.onTransitionEnd=function(t){var e=t.target;e.classList.contains("fdb")&&this.feedback.removeChild(e)},e.exports.RoundView=i},{"../shared/helpers":5}],3:[function(t,e,n){"use strict";function i(){this.root=document.getElementById("backdrop"),this.text=this.root.querySelector(".bdp-text"),this.subtext=this.root.querySelector(".bdp-subtext")}i.prototype.update=function(t,e,n){this.text.textContent=t,this.subtext.textContent=e,this.root.classList.toggle("hidden",!n)},i.prototype.hide=function(){this.root.classList.add("hidden")},e.exports.Backdrop=i},{}],4:[function(t,e,n){"use strict";e.exports={isProd:!1,prodUrl:"http://taekwon.do/",devUrl:"http://taekwon.do/",cookieExpires:"12h",primusConfig:{strategy:["online","disconnect"]}}},{}],5:[function(t,e,n){"use strict";var i={subscribeToEvents:function(t,e,n,i){n.forEach(function(n){t.primus.on(e+"."+n,i[n].bind(i))},this)},shake:function(t){var e=function n(){t.classList.remove("shake"),t.removeEventListener("animationend",n)};t.addEventListener("animationend",e),t.classList.add("shake")},enableBtn:function(t,e){e?t.removeAttribute("disabled"):t.setAttribute("disabled","disabled")}};e.exports=i},{}],6:[function(t,e,n){"use strict";function i(t){return o.enabled()?(this.identity=t,this.backdrop=new a,this.id=o.get("id"),this.url=(r.isProd?r.prodUrl:r.devUrl)+"?identity="+t,this.id&&(this.url+="&id="+this.id),console.log("Connecting to server"),this.primus=new Primus(this.url,r.primusConfig),this.primus.on("error",this.wsError.bind(this)),this.primus.on("reconnected",this.wsReconnected.bind(this)),s.subscribeToEvents(this,"io",["saveId","setPageTitle","updateBackdrop","alert","error"],this),void(r.isProd||(this.primus.on("open",function(){console.info("Connection is alive and kicking")}),this.primus.on("timeout",function(t){console.warn("Timeout!",t)}),this.primus.on("end",function(){console.info("Connection closed")}),this.primus.on("incoming::data",function(t){try{var e=JSON.parse(t);if(e&&e.emit)return void console.log(e.emit[0],e.emit[1])}catch(n){}console.log(t)}),this.primus.on("reconnect",function(){console.log("Reconnect attempt started")}),this.primus.on("reconnect scheduled",function(t){console.log("Reconnecting in %d ms",t.scheduled),console.log("This is attempt %d out of %d",t.attempt,t.retries)}),this.primus.on("reconnect timeout",function(t){console.warn("Reconnection timed out",t)}),this.primus.on("reconnect failed",function(t){console.warn("Reconnection failed",t)}),this.primus.on("online",function(t){console.info("Online!",t)}),this.primus.on("offline",function(t){console.warn("Offline!",t)})))):void this.error({message:"Enable cookies and try again"})}var o=t("tiny-cookie"),r=t("./config"),s=t("./helpers"),a=t("./backdrop").Backdrop;i.prototype.wsError=function(t){return console.warn("Web Socket error",t.code),1001!==t.code&&1006===t.code?void this.updateBackdrop({text:"Connection lost",subtext:"Attempting to reconnect...",visible:!0}):void 0},i.prototype.wsReconnected=function(){console.info("Reconnected"),this.backdrop.hide()},i.prototype.saveId=function(t){o.set("id",t.id,{expires:r.cookieExpires})},i.prototype.setPageTitle=function(t){document.title=t.title},i.prototype.updateBackdrop=function(t){this.backdrop.update(t.text,t.subtext,t.visible)},i.prototype.alert=function(t){window.alert(t.reason)},i.prototype.error=function(t){var e=t.message||"Unexpected error";console.error("Error:",e),document.getElementById("backdrop").classList.add("hidden"),[].forEach.call(document.querySelectorAll(".view"),function(t){t.classList.add("hidden")});var n=document.getElementById("error");n.classList.remove("hidden"),n.querySelector(".err-instr").textContent=e,n.querySelector(".err-btn--retry").addEventListener("click",function(){window.location.reload()})},i.prototype.send=function(t,e){this.primus.emit(t,e)},i.prototype.sendFunc=function(t){return this.send.bind(this,t)},e.exports.IO=i},{"./backdrop":3,"./config":4,"./helpers":5,"tiny-cookie":20}],7:[function(t,e,n){"use strict";function i(t){this.io=t,this.root=document.getElementById("login"),this.instr=this.root.querySelector(".login-instr"),this.field=this.root.querySelector(".login-field"),this.btn=this.root.querySelector(".login-btn"),this.btn.addEventListener("click",this.sendIdentification.bind(this)),this.root.querySelector(".login-form").addEventListener("submit",function(t){t.preventDefault()}),o.subscribeToEvents(t,"login",["setInstr","focusField","blurField","shakeResetField"],this)}var o=t("./helpers");i.prototype.sendIdentification=function(){this.io.send("identification",{identity:this.io.identity,value:this.field.value})},i.prototype.setInstr=function(t){this.instr.textContent=t.text},i.prototype.focusField=function(){setTimeout(function(){this.field.focus()}.bind(this),100)},i.prototype.blurField=function(){this.field.blur()},i.prototype.shakeResetField=function(){this.field.value="",this.field.focus(),o.shake(this.field)},e.exports.LoginView=i},{"./helpers":5}],8:[function(t,e,n){"use strict";function i(t){this.io=t,this.root=document.getElementById("ring-list"),this.instr=this.root.querySelector(".rl-instr"),this.list=this.root.querySelector(".rl-list"),this.list.addEventListener("click",this.onListDelegate.bind(this)),o.subscribeToEvents(t,"ringListView",["setInstr","updateList"],this)}var o=t("./helpers"),r=t("../templates/ring-list.hbs");i.prototype.setInstr=function(t){this.instr.textContent=t.text},i.prototype.updateList=function(t){this.list.innerHTML=r({isJP:"jury-president"===this.io.identity,rings:t.ringStates})},i.prototype.onListDelegate=function(t){var e=t.target;if(e&&"BUTTON"===e.nodeName){e.blur();var n=parseInt(e.dataset.index,10);this.io.send("selectRing",{index:n})}},e.exports.RingListView=i},{"../templates/ring-list.hbs":9,"./helpers":5}],9:[function(t,e,n){var i=t("hbsfy/runtime");e.exports=i.template({1:function(t,e,n,i){var o;return null!=(o=e.each.call(t,null!=t?t.rings:t,{name:"each",hash:{},fn:this.program(2,i,0),inverse:this.noop,data:i}))?o:""},2:function(t,e,n,i){var o,r,s=e.helperMissing,a="function",c=this.escapeExpression;return'		<li><button type="button" class="btn rl-btn" data-index="'+c((r=null!=(r=e.index||(null!=t?t.index:t))?r:s,typeof r===a?r.call(t,{name:"index",hash:{},data:i}):r))+'"'+(null!=(o=e["if"].call(t,null!=t?t.open:t,{name:"if",hash:{},fn:this.program(3,i,0),inverse:this.noop,data:i}))?o:"")+">"+c((r=null!=(r=e.number||(null!=t?t.number:t))?r:s,typeof r===a?r.call(t,{name:"number",hash:{},data:i}):r))+"</button></li>\r\n"},3:function(t,e,n,i){return" disabled"},5:function(t,e,n,i){var o;return null!=(o=e.each.call(t,null!=t?t.rings:t,{name:"each",hash:{},fn:this.program(6,i,0),inverse:this.noop,data:i}))?o:""},6:function(t,e,n,i){var o,r,s=e.helperMissing,a="function",c=this.escapeExpression;return'		<li><button type="button" class="btn no-hover rl-btn" data-index="'+c((r=null!=(r=e.index||(null!=t?t.index:t))?r:s,typeof r===a?r.call(t,{name:"index",hash:{},data:i}):r))+'"'+(null!=(o=e.unless.call(t,null!=t?t.open:t,{name:"unless",hash:{},fn:this.program(3,i,0),inverse:this.noop,data:i}))?o:"")+">"+c((r=null!=(r=e.number||(null!=t?t.number:t))?r:s,typeof r===a?r.call(t,{name:"number",hash:{},data:i}):r))+"</button></li>\r\n"},compiler:[6,">= 2.0.0-beta.1"],main:function(t,e,n,i){var o;return null!=(o=e["if"].call(t,null!=t?t.isJP:t,{name:"if",hash:{},fn:this.program(1,i,0),inverse:this.program(5,i,0),data:i}))?o:""},useData:!0})},{"hbsfy/runtime":19}],10:[function(t,e,n){!function(){"use strict";function t(e,n){function o(t,e){return function(){return t.apply(e,arguments)}}var r;if(n=n||{},this.trackingClick=!1,this.trackingClickStart=0,this.targetElement=null,this.touchStartX=0,this.touchStartY=0,this.lastTouchIdentifier=0,this.touchBoundary=n.touchBoundary||10,this.layer=e,this.tapDelay=n.tapDelay||200,this.tapTimeout=n.tapTimeout||700,!t.notNeeded(e)){for(var s=["onMouse","onClick","onTouchStart","onTouchMove","onTouchEnd","onTouchCancel"],a=this,c=0,l=s.length;l>c;c++)a[s[c]]=o(a[s[c]],a);i&&(e.addEventListener("mouseover",this.onMouse,!0),e.addEventListener("mousedown",this.onMouse,!0),e.addEventListener("mouseup",this.onMouse,!0)),e.addEventListener("click",this.onClick,!0),e.addEventListener("touchstart",this.onTouchStart,!1),e.addEventListener("touchmove",this.onTouchMove,!1),e.addEventListener("touchend",this.onTouchEnd,!1),e.addEventListener("touchcancel",this.onTouchCancel,!1),Event.prototype.stopImmediatePropagation||(e.removeEventListener=function(t,n,i){var o=Node.prototype.removeEventListener;"click"===t?o.call(e,t,n.hijacked||n,i):o.call(e,t,n,i)},e.addEventListener=function(t,n,i){var o=Node.prototype.addEventListener;"click"===t?o.call(e,t,n.hijacked||(n.hijacked=function(t){t.propagationStopped||n(t)}),i):o.call(e,t,n,i)}),"function"==typeof e.onclick&&(r=e.onclick,e.addEventListener("click",function(t){r(t)},!1),e.onclick=null)}}var n=navigator.userAgent.indexOf("Windows Phone")>=0,i=navigator.userAgent.indexOf("Android")>0&&!n,o=/iP(ad|hone|od)/.test(navigator.userAgent)&&!n,r=o&&/OS 4_\d(_\d)?/.test(navigator.userAgent),s=o&&/OS [6-7]_\d/.test(navigator.userAgent),a=navigator.userAgent.indexOf("BB10")>0;t.prototype.needsClick=function(t){switch(t.nodeName.toLowerCase()){case"button":case"select":case"textarea":if(t.disabled)return!0;break;case"input":if(o&&"file"===t.type||t.disabled)return!0;break;case"label":case"iframe":case"video":return!0}return/\bneedsclick\b/.test(t.className)},t.prototype.needsFocus=function(t){switch(t.nodeName.toLowerCase()){case"textarea":return!0;case"select":return!i;case"input":switch(t.type){case"button":case"checkbox":case"file":case"image":case"radio":case"submit":return!1}return!t.disabled&&!t.readOnly;default:return/\bneedsfocus\b/.test(t.className)}},t.prototype.sendClick=function(t,e){var n,i;document.activeElement&&document.activeElement!==t&&document.activeElement.blur(),i=e.changedTouches[0],n=document.createEvent("MouseEvents"),n.initMouseEvent(this.determineEventType(t),!0,!0,window,1,i.screenX,i.screenY,i.clientX,i.clientY,!1,!1,!1,!1,0,null),n.forwardedTouchEvent=!0,t.dispatchEvent(n)},t.prototype.determineEventType=function(t){return i&&"select"===t.tagName.toLowerCase()?"mousedown":"click"},t.prototype.focus=function(t){var e;o&&t.setSelectionRange&&0!==t.type.indexOf("date")&&"time"!==t.type&&"month"!==t.type?(e=t.value.length,t.setSelectionRange(e,e)):t.focus()},t.prototype.updateScrollParent=function(t){var e,n;if(e=t.fastClickScrollParent,!e||!e.contains(t)){n=t;do{if(n.scrollHeight>n.offsetHeight){e=n,t.fastClickScrollParent=n;break}n=n.parentElement}while(n)}e&&(e.fastClickLastScrollTop=e.scrollTop)},t.prototype.getTargetElementFromEventTarget=function(t){return t.nodeType===Node.TEXT_NODE?t.parentNode:t},t.prototype.onTouchStart=function(t){var e,n,i;if(t.targetTouches.length>1)return!0;if(e=this.getTargetElementFromEventTarget(t.target),n=t.targetTouches[0],o){if(i=window.getSelection(),i.rangeCount&&!i.isCollapsed)return!0;if(!r){if(n.identifier&&n.identifier===this.lastTouchIdentifier)return t.preventDefault(),!1;this.lastTouchIdentifier=n.identifier,this.updateScrollParent(e)}}return this.trackingClick=!0,this.trackingClickStart=t.timeStamp,this.targetElement=e,this.touchStartX=n.pageX,this.touchStartY=n.pageY,t.timeStamp-this.lastClickTime<this.tapDelay&&t.preventDefault(),!0},t.prototype.touchHasMoved=function(t){var e=t.changedTouches[0],n=this.touchBoundary;return Math.abs(e.pageX-this.touchStartX)>n||Math.abs(e.pageY-this.touchStartY)>n?!0:!1},t.prototype.onTouchMove=function(t){return this.trackingClick?((this.targetElement!==this.getTargetElementFromEventTarget(t.target)||this.touchHasMoved(t))&&(this.trackingClick=!1,this.targetElement=null),!0):!0},t.prototype.findControl=function(t){return void 0!==t.control?t.control:t.htmlFor?document.getElementById(t.htmlFor):t.querySelector("button, input:not([type=hidden]), keygen, meter, output, progress, select, textarea")},t.prototype.onTouchEnd=function(t){var e,n,a,c,l,u=this.targetElement;if(!this.trackingClick)return!0;if(t.timeStamp-this.lastClickTime<this.tapDelay)return this.cancelNextClick=!0,!0;if(t.timeStamp-this.trackingClickStart>this.tapTimeout)return!0;if(this.cancelNextClick=!1,this.lastClickTime=t.timeStamp,n=this.trackingClickStart,this.trackingClick=!1,this.trackingClickStart=0,s&&(l=t.changedTouches[0],u=document.elementFromPoint(l.pageX-window.pageXOffset,l.pageY-window.pageYOffset)||u,u.fastClickScrollParent=this.targetElement.fastClickScrollParent),a=u.tagName.toLowerCase(),"label"===a){if(e=this.findControl(u)){if(this.focus(u),i)return!1;u=e}}else if(this.needsFocus(u))return t.timeStamp-n>100||o&&window.top!==window&&"input"===a?(this.targetElement=null,!1):(this.focus(u),this.sendClick(u,t),o&&"select"===a||(this.targetElement=null,t.preventDefault()),!1);return o&&!r&&(c=u.fastClickScrollParent,c&&c.fastClickLastScrollTop!==c.scrollTop)?!0:(this.needsClick(u)||(t.preventDefault(),this.sendClick(u,t)),!1)},t.prototype.onTouchCancel=function(){this.trackingClick=!1,this.targetElement=null},t.prototype.onMouse=function(t){return this.targetElement?t.forwardedTouchEvent?!0:t.cancelable&&(!this.needsClick(this.targetElement)||this.cancelNextClick)?(t.stopImmediatePropagation?t.stopImmediatePropagation():t.propagationStopped=!0,t.stopPropagation(),t.preventDefault(),!1):!0:!0},t.prototype.onClick=function(t){var e;return this.trackingClick?(this.targetElement=null,this.trackingClick=!1,!0):"submit"===t.target.type&&0===t.detail?!0:(e=this.onMouse(t),e||(this.targetElement=null),e)},t.prototype.destroy=function(){var t=this.layer;i&&(t.removeEventListener("mouseover",this.onMouse,!0),t.removeEventListener("mousedown",this.onMouse,!0),t.removeEventListener("mouseup",this.onMouse,!0)),t.removeEventListener("click",this.onClick,!0),t.removeEventListener("touchstart",this.onTouchStart,!1),t.removeEventListener("touchmove",this.onTouchMove,!1),t.removeEventListener("touchend",this.onTouchEnd,!1),t.removeEventListener("touchcancel",this.onTouchCancel,!1)},t.notNeeded=function(t){var e,n,o,r;if("undefined"==typeof window.ontouchstart)return!0;if(n=+(/Chrome\/([0-9]+)/.exec(navigator.userAgent)||[,0])[1]){if(!i)return!0;if(e=document.querySelector("meta[name=viewport]")){if(-1!==e.content.indexOf("user-scalable=no"))return!0;if(n>31&&document.documentElement.scrollWidth<=window.outerWidth)return!0}}if(a&&(o=navigator.userAgent.match(/Version\/([0-9]*)\.([0-9]*)/),o[1]>=10&&o[2]>=3&&(e=document.querySelector("meta[name=viewport]")))){if(-1!==e.content.indexOf("user-scalable=no"))return!0;if(document.documentElement.scrollWidth<=window.outerWidth)return!0}return"none"===t.style.msTouchAction||"manipulation"===t.style.touchAction?!0:(r=+(/Firefox\/([0-9]+)/.exec(navigator.userAgent)||[,0])[1],r>=27&&(e=document.querySelector("meta[name=viewport]"),e&&(-1!==e.content.indexOf("user-scalable=no")||document.documentElement.scrollWidth<=window.outerWidth))?!0:"none"===t.style.touchAction||"manipulation"===t.style.touchAction?!0:!1)},t.attach=function(e,n){return new t(e,n)},"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(function(){return t}):"undefined"!=typeof e&&e.exports?(e.exports=t.attach,e.exports.FastClick=t):window.FastClick=t}()},{}],11:[function(t,e,n){"use strict";function i(){var t=new s.HandlebarsEnvironment;return h.extend(t,s),t.SafeString=c["default"],t.Exception=u["default"],t.Utils=h,t.escapeExpression=h.escapeExpression,t.VM=f,t.template=function(e){return f.template(e,t)},t}var o=function(t){return t&&t.__esModule?t:{"default":t}};n.__esModule=!0;var r=t("./handlebars/base"),s=o(r),a=t("./handlebars/safe-string"),c=o(a),l=t("./handlebars/exception"),u=o(l),d=t("./handlebars/utils"),h=o(d),p=t("./handlebars/runtime"),f=o(p),m=t("./handlebars/no-conflict"),g=o(m),v=i();v.create=i,g["default"](v),v["default"]=v,n["default"]=v,e.exports=n["default"]},{"./handlebars/base":12,"./handlebars/exception":13,"./handlebars/no-conflict":14,"./handlebars/runtime":15,"./handlebars/safe-string":16,"./handlebars/utils":17}],12:[function(t,e,n){"use strict";function i(t,e){this.helpers=t||{},this.partials=e||{},o(this)}function o(t){t.registerHelper("helperMissing",function(){if(1===arguments.length)return void 0;throw new u["default"]('Missing helper: "'+arguments[arguments.length-1].name+'"')}),t.registerHelper("blockHelperMissing",function(e,n){var i=n.inverse,o=n.fn;if(e===!0)return o(this);if(e===!1||null==e)return i(this);if(f(e))return e.length>0?(n.ids&&(n.ids=[n.name]),t.helpers.each(e,n)):i(this);if(n.data&&n.ids){var s=r(n.data);s.contextPath=c.appendContextPath(n.data.contextPath,n.name),n={data:s}}return o(e,n)}),t.registerHelper("each",function(t,e){function n(e,n,o){l&&(l.key=e,l.index=n,l.first=0===n,l.last=!!o,d&&(l.contextPath=d+e)),a+=i(t[e],{data:l,blockParams:c.blockParams([t[e],e],[d+e,null])})}if(!e)throw new u["default"]("Must pass iterator to #each");var i=e.fn,o=e.inverse,s=0,a="",l=void 0,d=void 0;if(e.data&&e.ids&&(d=c.appendContextPath(e.data.contextPath,e.ids[0])+"."),m(t)&&(t=t.call(this)),e.data&&(l=r(e.data)),t&&"object"==typeof t)if(f(t))for(var h=t.length;h>s;s++)n(s,s,s===t.length-1);else{var p=void 0;for(var g in t)t.hasOwnProperty(g)&&(p&&n(p,s-1),p=g,s++);p&&n(p,s-1,!0)}return 0===s&&(a=o(this)),a}),t.registerHelper("if",function(t,e){return m(t)&&(t=t.call(this)),!e.hash.includeZero&&!t||c.isEmpty(t)?e.inverse(this):e.fn(this)}),t.registerHelper("unless",function(e,n){return t.helpers["if"].call(this,e,{fn:n.inverse,inverse:n.fn,hash:n.hash})}),t.registerHelper("with",function(t,e){m(t)&&(t=t.call(this));var n=e.fn;if(c.isEmpty(t))return e.inverse(this);if(e.data&&e.ids){var i=r(e.data);i.contextPath=c.appendContextPath(e.data.contextPath,e.ids[0]),e={data:i}}return n(t,e)}),t.registerHelper("log",function(e,n){var i=n.data&&null!=n.data.level?parseInt(n.data.level,10):1;t.log(i,e)}),t.registerHelper("lookup",function(t,e){return t&&t[e]})}function r(t){var e=c.extend({},t);return e._parent=t,e}var s=function(t){return t&&t.__esModule?t:{"default":t}};n.__esModule=!0,n.HandlebarsEnvironment=i,n.createFrame=r;var a=t("./utils"),c=s(a),l=t("./exception"),u=s(l),d="3.0.1";n.VERSION=d;var h=6;n.COMPILER_REVISION=h;var p={1:"<= 1.0.rc.2",2:"== 1.0.0-rc.3",3:"== 1.0.0-rc.4",4:"== 1.x.x",5:"== 2.0.0-alpha.x",6:">= 2.0.0-beta.1"};n.REVISION_CHANGES=p;var f=c.isArray,m=c.isFunction,g=c.toString,v="[object Object]";i.prototype={constructor:i,logger:b,log:y,registerHelper:function(t,e){if(g.call(t)===v){if(e)throw new u["default"]("Arg not supported with multiple helpers");c.extend(this.helpers,t)}else this.helpers[t]=e},unregisterHelper:function(t){delete this.helpers[t]},registerPartial:function(t,e){if(g.call(t)===v)c.extend(this.partials,t);else{if("undefined"==typeof e)throw new u["default"]("Attempting to register a partial as undefined");this.partials[t]=e}},unregisterPartial:function(t){delete this.partials[t]}};var b={methodMap:{0:"debug",1:"info",2:"warn",3:"error"},DEBUG:0,INFO:1,WARN:2,ERROR:3,level:1,log:function(t,e){if("undefined"!=typeof console&&b.level<=t){var n=b.methodMap[t];(console[n]||console.log).call(console,e)}}};n.logger=b;var y=b.log;n.log=y},{"./exception":13,"./utils":17}],13:[function(t,e,n){"use strict";function i(t,e){var n=e&&e.loc,r=void 0,s=void 0;n&&(r=n.start.line,s=n.start.column,t+=" - "+r+":"+s);for(var a=Error.prototype.constructor.call(this,t),c=0;c<o.length;c++)this[o[c]]=a[o[c]];Error.captureStackTrace&&Error.captureStackTrace(this,i),n&&(this.lineNumber=r,this.column=s)}n.__esModule=!0;var o=["description","fileName","lineNumber","message","name","number","stack"];i.prototype=new Error,n["default"]=i,e.exports=n["default"]},{}],14:[function(t,e,n){(function(t){"use strict";n.__esModule=!0,n["default"]=function(e){var n="undefined"!=typeof t?t:window,i=n.Handlebars;e.noConflict=function(){n.Handlebars===e&&(n.Handlebars=i)}},e.exports=n["default"]}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],15:[function(t,e,n){"use strict";function i(t){var e=t&&t[0]||1,n=m.COMPILER_REVISION;if(e!==n){if(n>e){var i=m.REVISION_CHANGES[n],o=m.REVISION_CHANGES[e];throw new f["default"]("Template was precompiled with an older version of Handlebars than the current runtime. Please update your precompiler to a newer version ("+i+") or downgrade your runtime to an older version ("+o+").")}throw new f["default"]("Template was precompiled with a newer version of Handlebars than the current runtime. Please update your runtime to a newer version ("+t[1]+").")}}function o(t,e){function n(n,i,o){o.hash&&(i=h.extend({},i,o.hash)),n=e.VM.resolvePartial.call(this,n,i,o);var r=e.VM.invokePartial.call(this,n,i,o);if(null==r&&e.compile&&(o.partials[o.name]=e.compile(n,t.compilerOptions,e),r=o.partials[o.name](i,o)),null!=r){if(o.indent){for(var s=r.split("\n"),a=0,c=s.length;c>a&&(s[a]||a+1!==c);a++)s[a]=o.indent+s[a];r=s.join("\n")}return r}throw new f["default"]("The partial "+o.name+" could not be compiled when running in runtime-only mode")}function i(e){var n=void 0===arguments[1]?{}:arguments[1],r=n.data;i._setup(n),!n.partial&&t.useData&&(r=l(e,r));var s=void 0,a=t.useBlockParams?[]:void 0;return t.useDepths&&(s=n.depths?[e].concat(n.depths):[e]),t.main.call(o,e,o.helpers,o.partials,r,a,s)}if(!e)throw new f["default"]("No environment passed to template");if(!t||!t.main)throw new f["default"]("Unknown template object: "+typeof t);e.VM.checkRevision(t.compiler);var o={strict:function(t,e){if(!(e in t))throw new f["default"]('"'+e+'" not defined in '+t);return t[e]},lookup:function(t,e){for(var n=t.length,i=0;n>i;i++)if(t[i]&&null!=t[i][e])return t[i][e]},lambda:function(t,e){return"function"==typeof t?t.call(e):t},escapeExpression:h.escapeExpression,invokePartial:n,fn:function(e){return t[e]},programs:[],program:function(t,e,n,i,o){var s=this.programs[t],a=this.fn(t);return e||o||i||n?s=r(this,t,a,e,n,i,o):s||(s=this.programs[t]=r(this,t,a)),s},data:function(t,e){for(;t&&e--;)t=t._parent;return t},merge:function(t,e){var n=t||e;return t&&e&&t!==e&&(n=h.extend({},e,t)),n},noop:e.VM.noop,compilerInfo:t.compiler};return i.isTop=!0,i._setup=function(n){n.partial?(o.helpers=n.helpers,o.partials=n.partials):(o.helpers=o.merge(n.helpers,e.helpers),t.usePartial&&(o.partials=o.merge(n.partials,e.partials)))},i._child=function(e,n,i,s){if(t.useBlockParams&&!i)throw new f["default"]("must pass block params");if(t.useDepths&&!s)throw new f["default"]("must pass parent depths");return r(o,e,t[e],n,0,i,s)},i}function r(t,e,n,i,o,r,s){function a(e){var o=void 0===arguments[1]?{}:arguments[1];return n.call(t,e,t.helpers,t.partials,o.data||i,r&&[o.blockParams].concat(r),s&&[e].concat(s))}return a.program=e,a.depth=s?s.length:0,a.blockParams=o||0,a}function s(t,e,n){return t?t.call||n.name||(n.name=t,t=n.partials[t]):t=n.partials[n.name],t}function a(t,e,n){if(n.partial=!0,void 0===t)throw new f["default"]("The partial "+n.name+" could not be found");return t instanceof Function?t(e,n):void 0}function c(){return""}function l(t,e){return e&&"root"in e||(e=e?m.createFrame(e):{},e.root=t),e}var u=function(t){return t&&t.__esModule?t:{"default":t}};n.__esModule=!0,n.checkRevision=i,n.template=o,n.wrapProgram=r,n.resolvePartial=s,n.invokePartial=a,n.noop=c;var d=t("./utils"),h=u(d),p=t("./exception"),f=u(p),m=t("./base")},{"./base":12,"./exception":13,"./utils":17}],16:[function(t,e,n){"use strict";function i(t){this.string=t}n.__esModule=!0,i.prototype.toString=i.prototype.toHTML=function(){return""+this.string},n["default"]=i,e.exports=n["default"]},{}],17:[function(t,e,n){"use strict";function i(t){return u[t]}function o(t){for(var e=1;e<arguments.length;e++)for(var n in arguments[e])Object.prototype.hasOwnProperty.call(arguments[e],n)&&(t[n]=arguments[e][n]);return t}function r(t,e){for(var n=0,i=t.length;i>n;n++)if(t[n]===e)return n;return-1}function s(t){if("string"!=typeof t){if(t&&t.toHTML)return t.toHTML();if(null==t)return"";if(!t)return t+"";t=""+t}return h.test(t)?t.replace(d,i):t}function a(t){return t||0===t?m(t)&&0===t.length?!0:!1:!0}function c(t,e){return t.path=e,t}function l(t,e){return(t?t+".":"")+e}n.__esModule=!0,n.extend=o,n.indexOf=r,n.escapeExpression=s,n.isEmpty=a,n.blockParams=c,n.appendContextPath=l;var u={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;","`":"&#x60;"},d=/[&<>"'`]/g,h=/[&<>"'`]/,p=Object.prototype.toString;n.toString=p;var f=function(t){return"function"==typeof t};f(/x/)&&(n.isFunction=f=function(t){return"function"==typeof t&&"[object Function]"===p.call(t)});var f;n.isFunction=f;var m=Array.isArray||function(t){return t&&"object"==typeof t?"[object Array]"===p.call(t):!1};n.isArray=m},{}],18:[function(t,e,n){e.exports=t("./dist/cjs/handlebars.runtime")["default"]},{"./dist/cjs/handlebars.runtime":11}],19:[function(t,e,n){e.exports=t("handlebars/runtime")["default"]},{"handlebars/runtime":18}],20:[function(t,e,n){!function(t,i){"function"==typeof define&&define.amd?define(i):"object"==typeof n?e.exports=i():t.Cookie=i()}(this,function(t){"use strict";function e(n,i,o){return i===t?e.get(n):void(null===i?e.remove(n):e.set(n,i,o))}function n(t){return t.replace(/[.*+?^$|[\](){}\\-]/g,"\\$&")}function i(t){var e="";for(var n in t)if(t.hasOwnProperty(n)){if("expires"===n){var i=t[n];"object"!=typeof i&&(i+="number"==typeof i?"D":"",i=o(i)),t[n]=i.toUTCString()}e+=";"+n+"="+t[n]}return t.hasOwnProperty("path")||(e+=";path=/"),e}function o(t){var e=new Date,n=t.charAt(t.length-1),i=parseInt(t,10);switch(n){case"Y":e.setFullYear(e.getFullYear()+i);break;case"M":e.setMonth(e.getMonth()+i);break;case"D":e.setDate(e.getDate()+i);break;case"h":e.setHours(e.getHours()+i);break;case"m":e.setMinutes(e.getMinutes()+i);break;case"s":e.setSeconds(e.getSeconds()+i);break;default:e=new Date(t)}return e}return e.enabled=function(){var t,n="__test_key";return document.cookie=n+"=1",t=!!document.cookie,t&&e.remove(n),t},e.get=function(t,e){if("string"!=typeof t||!t)return null;t="(?:^|; )"+n(t)+"(?:=([^;]*?))?(?:;|$)";var i=new RegExp(t),o=i.exec(document.cookie);return null!==o?e?o[1]:decodeURIComponent(o[1]):null},e.getRaw=function(t){return e.get(t,!0)},e.set=function(t,e,n,o){n!==!0&&(o=n,n=!1),o=i(o?o:{});var r=t+"="+(n?e:encodeURIComponent(e))+o;document.cookie=r},e.setRaw=function(t,n,i){e.set(t,n,!0,i)},e.remove=function(t){e.set(t,"a",{expires:new Date})},e})},{}]},{},[1]);
//# sourceMappingURL=corner-judge.js.map