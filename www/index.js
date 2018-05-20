
var sock;
var debug = false;

var serverOutput;
var clientInput;
var autoScrollCheckBox;
const maxServerOutputLength = 20000;


window.onload = function() {
    serverOutput = document.getElementById('server');
    clientInput = document.getElementById('user');
    autoScrollCheckBox = document.getElementById('autoScrollCheckBox');

    clientInput.onkeypress = function(e) {
        var event = e || window.event;
        var charCode = event.which || event.keyCode;
        if ( charCode == '13' ) {  // Enter pressed
            let valToSend = clientInput.value;
            send(valToSend);
            clientInput.value = '';
            return false;
        }
    }

    // wire up buttons
    // document.getElementById('disconnect').onclick = function(e) {
    //     client.close();
    // }
    // document.getElementById('connect').onclick = function(e) {
    //     serverOutput.innerHTML = "";
    //     client = connect();
    //     // clientInput.value = 'connect ' + getRandomName() + ' pwd';
    //     clientInput.focus();
    // }

    // local storage stuff
    storage = window.localStorage;
    divMacros = document.getElementById('divMacros');
    divAliases = document.getElementById('divAliases');
    divTriggers = document.getElementById('divTriggers');
    macros = [];
    aliases = [];
    triggers = [];
    // clearCustomizationsInStorage();
    loadCustomizationsFromStorage();
    createCustomizationsDivs();
    // divMacros.addEventListener('focusout', saveCustomizationsInStorage);
    // divAliases.addEventListener('focusout', saveCustomizationsInStorage);

    connect();
    send("connect");
    clientInput.focus();
}

function connect() {
    sock = io.connect();
    sock.on('stream', function(buf){
        receive(buf);
    });
    sock.on('status', function(str){
        receive(str);
    });
    sock.on('connected', function(){
        console.log('connected');
    });
    sock.on('disconnect', function(){
        console.log('disconnected');
    });

}

function send(s) {
    s = s + '';
    s = s.trim();
    s = macroize(s);
    // split into separate commands around ; 
    let c = s.split(';');
    for (let i = 0; i < c.length; i++) {
        let cs = c[i];
        cs = cs + '\n';
        if (sock) {
            sock.emit('stream', cs);
            if (debug) console.log('Sent to server: ', cs);
        } else {
            console.log('Error: not connected, could not send "' + cs + '"');
        }
    }
}

function receive(s) {
    // new text received from server
    if (debug) console.log('Recd from server: ', s);

    // format for display
    var formatting = '';
    var lines = s.split('\r\n');
    for (let i=0; i < lines.length; i++) {
        var line = lines[i];


        // split lines to apply client functions
        line = substitute(line);
        if (line.length > 0) {
            triggerize(line);
            // line = line.replace(/\s\s/g, '&nbsp;');
            line = ansi_up.ansi_to_html(line);
            if (i < lines.length-1 && line.length > 0) line += '<br/>';
            // replace the prompt "> " with a empty line
            // var len = line.length;
            // if(len>=2 && line.substr(len-2) == '> ') line = line.substr(0, line-2) + '<br/>';
            formatting += line;
        }
    }
    s = formatting + '';

    if (s.length > 0) {
        // push to the display widget
        let q = serverOutput.innerHTML + s;
        // q += s + '\n';
        while (q.length > maxServerOutputLength) {
            let i = Math.max(q.indexOf('\n'), 10);
            q = q.substring(i);
        } 
        serverOutput.innerHTML = q;
        if (autoScrollCheckBox.checked) 
            serverOutput.scrollTop = serverOutput.scrollHeight;
    }
}



// Client-side functionality - macros and aliases and subs and triggers, oh my!
function macroize(s) {
    // apply macros and aliases
    s = s + '';
    let orig_s = s;
    s = s.trim();
    let ws = s.split(' ');
    try {
        for (let i = 0; i < macros.length; i++) {
            if (ws[0] === macros[i].n) {
                s = s.replace(macros[i].n, macros[i].v) ;
                ws = s.split(' ');
                i = macros.length;
            }
        }
        for (let wi = 0; wi < ws.length; wi++) {
            for (let i = 0; i < aliases.length; i++) { 
                if (ws[wi] === aliases[i].n) {
                    ws[wi] = aliases[i].v;
                    i = aliases.length;
                }
            }
        }
        s = ws.join(' ');
        if (debug) console.log("Macros applied to change \n   " + orig_s + "\n to \n   " + s);
        return s;
    } catch (e) {
        console.log("Error in a macro or alias produced the message: ", e);
        return orig_s;
    }
}

function substitute(s) {
    let orig_s = s;
    let changed = false;
    for (let i = 0; i < validSubs.length; i++) {
        if (validSubs[i].n.test(s)) {
            if (validSubs[i].v === "GAG"){
                s = "";
            }
            else {
                s = s.replace(validSubs[i].n, validSubs[i].v);
            }
            changed = true;
        }
    }
    if (changed && debug) console.log("Subs applied to change \n   " + orig_s + "\n to \n   " + s);
    return s;
}

const reParams = [/\$0/g, /\$1/g, /\$2/g, /\$3/g, /\$4/g, /\$5/g, /\$6/g, /\$7/g, /\$8/g, /\$9/g];
function triggerize(s) {
    for (let i = 0; i < validTriggers.length; i++) {
        if (validTriggers[i].n.test(s)) {
            let cmd = validTriggers[i].v;
            let arr = validTriggers[i].n.exec(s);
            // replace $n with arr[n]
            for (let j = 1; j < 10; j++) {
                if (arr[j]) {
                    // console.log("arr[j]: ", arr[j]);
                    cmd = cmd.replace(reParams[j], arr[j]);
                } else continue;
            }
            if (debug) console.log("Trigger " + validTriggers[i].n + " caused me to send: ", cmd);
            send(cmd); 
        }
    }
}

// displaying and loading and saving client-defined stuff in the browser
function loadCustomizationsFromStorage() {
    macros = (storage.getItem("macros") && JSON.parse(storage.getItem("macros")).m) || [];
    aliases = (storage.getItem("aliases") && JSON.parse(storage.getItem("aliases")).a) || [];
    subs = (storage.getItem("subs") && JSON.parse(storage.getItem("subs")).s) || [];
    triggers = (storage.getItem("triggers") && JSON.parse(storage.getItem("triggers")).t) || [];
    validateRegex();
}
var validSubs;
var validTriggers;
function validateRegex() {
    validSubs = [];
    validTriggers = [];
    for (let i = 0; i < subs.length; i++) {
        try {
            let re = new RegExp(subs[i].n);
            let ro = {};
            ro.n = re;
            ro.v = subs[i].v;
            validSubs.push(ro);
        } catch(e) {
            console.log("Invalid substitution regex: " + subs[i].n);
        }
    }
    for (let i = 0; i < triggers.length; i++) {
        try {
            let re = new RegExp(triggers[i].n);
            let ro = {};
            ro.n = re;
            ro.v = triggers[i].v;
            validTriggers.push(ro);
        } catch(e) {
            console.log("Invalid trigger regex: " + triggers[i].n);
        }
    }
}

function saveCustomizationsInStorage() {
    macros = [];
    let ms = divMacros.children;
    let changed = false;
    for (let i = 0; i < ms.length; i++) {
        if (ms[i].children.length == 3) {
            let o = {};
            let c = ms[i].children;
            o.n = c[0].value;
            o.v = c[1].value;
            if (o.n && o.v) {
                macros.push(o);
                changed = true;
            }
        }
    }
    aliases = [];
    let as = divAliases.children;
    for (let i = 0; i < as.length; i++) {
        if (as[i].children.length == 3) {
            let o = {};
            let c = as[i].children;
            o.n = c[0].value;
            o.v = c[1].value;
            if (o.n && o.v) {
                aliases.push(o);
                changed = true;
            }
        }
    }
    subs = [];
    let ss = divSubs.children;
    for (let i = 0; i < ss.length; i++) {
        if (ss[i].children.length == 3) {
            let o = {};
            let c = ss[i].children;
            o.n = c[0].value;
            o.v = c[1].value;
            if (o.n && o.v) {
                subs.push(o);
                changed = true;
            }
        }
    }
    triggers = [];
    let ts = divTriggers.children;
    for (let i = 0; i < ts.length; i++) {
        if (ts[i].children.length == 3) {
            let o = {};
            let c = ts[i].children;
            o.n = c[0].value;
            o.v = c[1].value;
            if (o.n && o.v) {
                triggers.push(o);
                changed = true;
            }
        }
    }
    if (changed) {
        let mo = {};
        mo.m = macros;
        let ao = {}
        ao.a = aliases;
        let so = {};
        so.s = subs;
        let to = {};
        to.t = triggers;
        storage.setItem("macros", JSON.stringify(mo));
        storage.setItem("aliases", JSON.stringify(ao));
        storage.setItem("subs", JSON.stringify(so));
        storage.setItem("triggers", JSON.stringify(to));
        loadCustomizationsFromStorage();
        if (debug) console.log("Saved macros: ", macros);
        if (debug) console.log("Saved aliases: ", aliases);
        if (debug) console.log("Saved subs: ", subs);
        if (debug) console.log("Saved triggers: ", triggers);
    }
}
function createCustomizationsDivs() {
    emptyNode(divMacros);
    divMacros.appendChild(widgetTitle("Macros: "));
    let bm = document.createElement('input');
    bm.type = 'button';
    bm.value = '+';
    bm.onclick = () => addWidget(divMacros);
    divMacros.appendChild(bm);
    for (let i = 0; i < macros.length; i++) {
        let w = addWidget(divMacros);
        w.children[0].value = macros[i].n;
        w.children[1].value = macros[i].v;
    }

    emptyNode(divAliases);
    divAliases.appendChild(widgetTitle("Aliases: "));
    let ba = document.createElement('input');
    ba.type = 'button';
    ba.value = '+';
    ba.onclick = () => addWidget(divAliases);
    divAliases.appendChild(ba);
    for (let i = 0; i < aliases.length; i++) {
        let w = addWidget(divAliases);
        w.children[0].value = aliases[i].n;
        w.children[1].value = aliases[i].v;
    }

    emptyNode(divSubs);
    divSubs.appendChild(widgetTitle("Substitutions: "));
    let sa = document.createElement('input');
    sa.type = 'button';
    sa.value = '+';
    sa.onclick = () => addWidget(divSubs);
    divSubs.appendChild(sa);
    for (let i = 0; i < subs.length; i++) {
        let w = addWidget(divSubs);
        w.children[0].value = subs[i].n;
        w.children[1].value = subs[i].v;
    }

    emptyNode(divTriggers);
    divTriggers.appendChild(widgetTitle("Triggers: "));
    let ta = document.createElement('input');
    ta.type = 'button';
    ta.value = '+';
    ta.onclick = () => addWidget(divTriggers);
    divTriggers.appendChild(ta);
    for (let i = 0; i < triggers.length; i++) {
        let w = addWidget(divTriggers);
        w.children[0].value = triggers[i].n;
        w.children[1].value = triggers[i].v;
    }
}
function widgetTitle(name) {
    let title = document.createElement("div");
    title.appendChild(document.createTextNode(name));
    return title;
}
function addWidget(container) { 
    let s = document.createElement('div');
    let n = document.createElement('input');
    n.type = 'text';
    n.className = 'shortInput';
    let v = document.createElement('input');
    v.type = 'text';
    v.className = 'longInput';
    let x = document.createElement('input');
    x.type = 'button';
    x.value = 'X';
    s.appendChild(n);
    s.appendChild(v);
    s.appendChild(x);
    x.onclick = () => s.remove();
    container.insertBefore(s, container.lastChild);
    return s;
}
function clearCustomizationsInStorage() {
    storage.removeItem('macros');
    storage.removeItem('aliases');
    storage.removeItem('subs');
    storage.removeItem('triggers');
}
function emptyNode(el) {
    while (el.firstChild) {
        el.removeChild(el.firstChild);
    }
}