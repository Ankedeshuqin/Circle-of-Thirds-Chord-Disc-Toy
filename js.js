const NS = "http://www.w3.org/2000/svg";

let fl = Math.floor; // 我受够在JavaScript中每次都要写那么长的Math.floor了
let sin = Math.sin; // 还有sin和cos
let cos = Math.cos;

function getNSharp(keySig) { // 根据调号文本获取调号升号数（负数表示降号数）
    let nSharp = -1;
    for(let i = 0; i < keySig.length - 1; i++) {
        switch(keySig[i]) {
        case "#":
            nSharp += 7; break;
        case "x":
            nSharp += 14; break;
        case "b":
            nSharp -= 7; break;
        }
    }
    nSharp += ["F", "C", "G", "D", "A", "E", "B"].indexOf(keySig[keySig.length - 1]);
    return nSharp;
}

function getKeySig(nSharp) { // 根据调号升号数获取调号文本
    let keySig = "";
    while(nSharp >= 6) {
        keySig = "#" + keySig;
        if(keySig.slice(0, 2) == "##")
            keySig = "x" + keySig.slice(2);
        nSharp -= 7;
    }
    while(nSharp <= -2) {
        keySig = "b" + keySig;
        nSharp += 7;
    }
    keySig += ["F", "C", "G", "D", "A", "E", "B"][nSharp + 1];
    return keySig;
}

// 元素变量
let SIniKeyTonalTone = document.getElementById("s-ini-key-tonal-tone");
let DChordBox = document.getElementById("d-chord-box");
let DChordDescription = document.getElementById("d-chord-description");
let TEnharmonic = document.getElementById("t-enharmonic");
let DBeforeModulBox = document.getElementById("d-before-modul-box");
let DAfterModulBox = document.getElementById("d-after-modul-box");
let TCurKeyTonalTone = document.getElementById("t-cur-key-tonal-tone");
let BReset = document.getElementById("b-reset");
let DRight = document.getElementById("d-right");
let Svg = document.getElementById("svg");

const SVG_WIDTH = 1200;

// 添加声音
let tones = []; // 范围：0~35，对应绝对音高
for(let i = 0; i < 36; i++) {
    tones.push(new Audio(`${i}.mp3`));
}

let g_curKeyTonalTone; // 当前调性主音的绝对音高
let g_iniKeyNSharp;
let g_curModulNSharp = 0; // 当前转调调性相对初始调性变化的调号升号数
let g_curKeyNSharp;
let g_curRotateSector = 0; // 当前圆盘旋转的扇区数

let g_Sel = {
    row: -1,
    col: -1,
    toString: function() {
        return `${this.row},${this.col}`;
    }
};

let g_Hl = {
    row: -1,
    col: -1,
    toString: function() {
        return `${this.row},${this.col}`;
    }
};

function getKeyTonalTone(keyNSharp) {
    while(keyNSharp < 0) keyNSharp += 12;
    let keyTonalTone = 12 + (7 * keyNSharp) % 12;
    if(keyTonalTone >= 19) keyTonalTone -= 12; // 调整一下八度，使绝对音高>= 19（中音G）的调性主音降低一个八度，以限定和弦的音高范围
    return keyTonalTone;
}

function setCurKey() {
    if(g_Sel.toString() != "-1,-1")
        stopNotes();

    g_iniKeyNSharp = getNSharp(SIniKeyTonalTone.value);
    g_curKeyNSharp = g_iniKeyNSharp + g_curModulNSharp;
    g_curKeyTonalTone = getKeyTonalTone(g_curKeyNSharp);

    TCurKeyTonalTone.textContent = getKeySig(g_curKeyNSharp);

    if(g_Sel.toString() != "-1,-1")
        playNotes(getChordNotes(g_Sel.row, g_Sel.col));
}

setCurKey();
SIniKeyTonalTone.onchange = setCurKey;

function playNotes(notes) {
    for(let i = 0; i < notes.length; i++)
        tones[notes[i] + g_curKeyTonalTone].play();
}

function stopNotes() {
    for(let i = 0; i < tones.length; i++) {
        tones[i].pause();
        tones[i].currentTime = 0;
    }
}

function getChordNotes(row, col) {
    const majScaleNotes = [0, 2, 4, 5, 7, 9, 11];
    const minScaleNotes = [0, 2, 3, 5, 7, 8, 10];

    let scaleNotes;

    let tonalIsMaj = fl(col / 3) % 2 == 1; // 主调调性是否为大调
    let tonicizedIsMaj = (fl(row / 4) % 2 == 0 ? tonalIsMaj : !tonalIsMaj); // 离调调性是否为大调

    if(tonicizedIsMaj) {
        scaleNotes = majScaleNotes.slice();
    } else {
        scaleNotes = minScaleNotes.slice();
    }
    
    if(row % 2 == 1) { // 和声调式
        if(tonicizedIsMaj)
            scaleNotes[5] -= 1;
        else
            scaleNotes[6] += 1;
    }

    // 变音调式
    if(fl(row / 4) % 2 == 0) {
        switch(col % 6) {
        case 2: // 小调，降调式二级音
        case 3: // 大调，降调式二级音
            scaleNotes[1] -= 1; break;
        case 0: // 小调，降调式四级音
            scaleNotes[3] -= 1; break;
        case 5: // 大调，升调式二级音
            scaleNotes[1] += 1; break;
        }
    } else {
        switch(col % 6) {
        case 3: // 小调，降调式二级音
        case 2: // 大调，降调式二级音
            scaleNotes[1] -= 1; break;
        case 5: // 小调，降调式四级音
            scaleNotes[3] -= 1; break;
        case 0: // 大调，升调式二级音
            scaleNotes[1] += 1; break;
        }
    }

    // 转换为离调调性音阶（但以对应主调一级的音为首）
    if(tonalIsMaj) {
        for(let i = 0; i < 7; i++) {
            scaleNotes[i] += majScaleNotes[[0, 2, 4, 1, 3, 5][fl(row / 4)]];
            if(scaleNotes[i] >= 12)
                scaleNotes[i] -= 12;
        }
        scaleNotes = scaleNotes.slice(7 - [0, 2, 4, 1, 3, 5][fl(row / 4)]).concat(scaleNotes.slice(0, 7 - [0, 2, 4, 1, 3, 5][fl(row / 4)]));
    } else {
        for(let i = 0; i < 7; i++) {
            scaleNotes[i] += minScaleNotes[[0, 2, 4, 6, 3, 5][fl(row / 4)]];
            if(scaleNotes[i] >= 12)
                scaleNotes[i] -= 12;
        }
        scaleNotes = scaleNotes.slice(7 - [0, 2, 4, 6, 3, 5][fl(row / 4)]).concat(scaleNotes.slice(0, 7 - [0, 2, 4, 6, 3, 5][fl(row / 4)]));
    }
    
    let notes = [
        scaleNotes[(fl(col / 6) * 2) % 7], // 根音
        scaleNotes[(fl(col / 6) * 2 + 2) % 7], // 三音
        scaleNotes[(fl(col / 6) * 2 + 4) % 7] // 五音
    ];
    if(fl(row / 2) % 2 == 1) { // 七和弦
        notes.push(scaleNotes[(fl(col / 6) * 2 + 6) % 7]); // 七音
    }

    // 修正一下八度，使组成音相对音高由低到高
    for(let i = 1; i < notes.length; i++) {
        if(notes[i] < notes[i - 1])
            notes[i] += 12;
    }

    // 调整一下八度，使根音的相对音高大于等于7（即自然五级音）的和弦降低一个八度，以限定和弦的音高范围。
    if(notes[0] >= 7) {
        for(let i = 0; i < notes.length; i++)
            notes[i] -= 12;
    }

    return notes;
}

function getChordNoteTexts(row, col) {
    const natScaleNotes = [0, 2, 4, 5, 7, 9, 11];
    const natScaleNoteTexts = ["1", "2", "3", "4", "5", "6", "7"];
    let notes = getChordNotes(row, col);

    let noteTexts = [
        natScaleNoteTexts[(fl(col / 6) * 2) % 7], // 根音
        natScaleNoteTexts[(fl(col / 6) * 2 + 2) % 7], // 三音
        natScaleNoteTexts[(fl(col / 6) * 2 + 4) % 7] // 五音
    ];
    if(fl(row / 2) % 2 == 1) { // 七和弦
        noteTexts.push(natScaleNoteTexts[(fl(col / 6) * 2 + 6) % 7]); // 七音
    }

    for(let i = 0; i < notes.length; i++) {
        let dTone = (notes[i] - natScaleNotes[((fl(col / 6) + i) * 2) % 7] + 18) % 12 - 6;
        while(dTone > 0) {
            noteTexts[i] = "#" + noteTexts[i];
            if(noteTexts[i].slice(0, 2) == "##")
                noteTexts[i] = "x" + noteTexts[i].slice(2);
            dTone--;
        }
        while(dTone < 0) {
            noteTexts[i] = "b" + noteTexts[i];
            dTone++;
        }
    }

    return noteTexts;
}

function getChordNotation(row, col) {
    if(fl(row / 4) != 0 && getChordNotes(row, col).toString() == getChordNotes(row % 4, col).toString())
        return getChordNotation(row % 4, col); // 如果离调和弦与对应级数的主调和弦一致，则使用主调和弦的标记

    const majKeyTriadNotations = ["T", "DT", "D", "DVII", "SII", "S", "TS"];
    const minKeyTriadNotations = ["t", "dt", "d", "dVII", "sII", "s", "ts"];

    let chordNotations;

    let tonalIsMaj = fl(col / 3) % 2 == 1; // 主调调性是否为大调
    let tonicizedIsMaj = (fl(row / 4) % 2 == 0 ? tonalIsMaj : !tonalIsMaj); // 离调调性是否为大调

    if(tonicizedIsMaj) {
        chordNotations = majKeyTriadNotations.slice();
    } else {
        chordNotations = minKeyTriadNotations.slice();
    }

    if(fl(row / 2) % 2 == 1) { // 七和弦
        for(let i = 0; i < 7; i++)
            chordNotations[i] += "7";
        if(tonicizedIsMaj)
            chordNotations[3] = "DVIIø7";
    }

    if(row % 2 == 1) { // 和声调式
        if(tonicizedIsMaj) {
            for(let i = 0; i < 7; i++) {
                chordNotations[i] = chordNotations[i].replace("S", "s");
            }
            if(fl(row / 2) % 2 == 1) {
                chordNotations[3] = "DVIIo7";
                chordNotations[5] = "sM7";
            }
        } else {
            for(let i = 0; i < 7; i++) {
                chordNotations[i] = chordNotations[i].replace("d", "D");
            }
            if(fl(row / 2) % 2 == 1) {
                chordNotations[3] = "DVIIo7";
                chordNotations[0] = "tM7";
            }
        }
    }

    // 变音调式
    if(fl(row / 4) % 2 == 0) {
        switch(col % 6) {
        case 2: // 小调，降调式二级音
        case 3: // 大调，降调式二级音
        case 5: // 大调，升调式二级音
            for(let i = 0; i < 7; i++) {
                if(i >= 2 && i <= 4 || i == 1 && fl(row / 2) % 2 == 1)
                    chordNotations[i] = (col % 6 == 5 ? "#" : "b") + (9 - i * 2) + chordNotations[i];
            }
            break;
        case 0: // 小调，降调式四级音
            for(let i = 0; i < 7; i++) {
                if(i >= 3 && i <= 5 || i == 2 && fl(row / 2) % 2 == 1)
                    chordNotations[i] = "b" + (11 - i * 2) + chordNotations[i];
            }
            break;
        }
    } else {
        switch(col % 6) {
        case 3: // 小调，降调式二级音
        case 2: // 大调，降调式二级音
        case 0: // 大调，升调式二级音
            for(let i = 0; i < 7; i++) {
                if(i >= 2 && i <= 4 || i == 1 && fl(row / 2) % 2 == 1)
                    chordNotations[i] = (col % 6 == 0 ? "#" : "b") + (9 - i * 2) + chordNotations[i];
            }
            break;
        case 5: // 小调，降调式四级音
            for(let i = 0; i < 7; i++) {
                if(i >= 3 && i <= 5 || i == 2 && fl(row / 2) % 2 == 1)
                    chordNotations[i] = "b" + (11 - i * 2) + chordNotations[i];
            }
            break;
        }
    }

    // 转换为离调和弦标记（但以对应主调一级的和弦为首）
    if(fl(row / 4) != 0) {
        if(tonalIsMaj) {
            for(let i = 0; i < 7; i++) {
                chordNotations[i] += "/" + majKeyTriadNotations[[0, 1, 2, 4, 5, 6][fl(row / 4)]];
                chordNotations[i] = chordNotations[i].replace(/(.*?)(D|d)([^Tt]*?)\/(D|d)$/, "$1$2$4$3"); // 重属和弦
            }
            chordNotations = chordNotations.slice(7 - [0, 1, 2, 4, 5, 6][fl(row / 4)]).concat(chordNotations.slice(0, 7 - [0, 1, 2, 4, 5, 6][fl(row / 4)]));
        } else {
            for(let i = 0; i < 7; i++) {
                chordNotations[i] += "/" + minKeyTriadNotations[[0, 1, 2, 3, 5, 6][fl(row / 4)]];
                chordNotations[i] = chordNotations[i].replace(/(.*?)(D|d)(.*?)\/(D|d)$/, "$1$2$4$3"); // 重属和弦
            }
            chordNotations = chordNotations.slice(7 - [0, 1, 2, 3, 5, 6][fl(row / 4)]).concat(chordNotations.slice(0, 7 - [0, 1, 2, 3, 5, 6][fl(row / 4)]));
        }
    }

    return chordNotations[fl(col / 6)];
}

function getNotesColor(notes) {
    let thirdDTone = notes[1] - notes[0];
    let fifthDTone = notes[2] - notes[0];

    let rgb;

    // 三和弦种类
    if(thirdDTone == 4 && fifthDTone == 7) rgb = [255, 0, 255]; // 大三纯五
    else if(thirdDTone == 3 && fifthDTone == 7) rgb = [255, 255, 0]; // 小三纯五
    else if(thirdDTone == 3 && fifthDTone == 6) rgb = [0, 255, 255]; // 小三减五
    else if(thirdDTone == 4 && fifthDTone == 8) rgb = [255, 0, 0]; // 大三增五
    else if(thirdDTone == 4 && fifthDTone == 6) rgb = [0, 128, 255]; // 大三减五
    else if(thirdDTone == 2 && fifthDTone == 6) rgb = [128, 0, 255]; // 减三减五
    else if(thirdDTone == 2 && fifthDTone == 5) rgb = [255, 128, 0]; // 减三倍减五
    else if(thirdDTone == 3 && fifthDTone == 5) rgb = [128, 255, 0]; // 小三倍减五
    else return; // 其他

    if(notes.length == 3) { // 三和弦，增加亮度（3/4）
        for(let i = 0; i < 3; i++)
            rgb[i] = Math.round((rgb[i] + 255 * 3) / 4);
    } else { // 七和弦
        let seventhDTone = notes[3] - notes[0];

        // 七度音种类
        if(seventhDTone == 11) { // 大七度，增加亮度（1/2）、降低饱和度（1/4）
            for(let i = 0; i < 3; i++)
                rgb[i] = Math.round((rgb[i] + 255) / 2);
            let l = Math.round((Math.max(...rgb) + Math.min(...rgb)) / 2);
            for(let i = 0; i < 3; i++)
                rgb[i] = Math.round((rgb[i] * 3 + l) / 4);
        } else if(seventhDTone == 10) { // 小七度，增加亮度（1/4）
            for(let i = 0; i < 3; i++)
                rgb[i] = Math.round((rgb[i] * 3 + 255) / 4);
        } else if(seventhDTone == 9) { // 减七度，增加亮度（1/4）、降低饱和度（1/4）
            for(let i = 0; i < 3; i++)
                rgb[i] = Math.round((rgb[i] * 3 + 255) / 4);
            let l = Math.round((Math.max(...rgb) + Math.min(...rgb)) / 2);
            for(let i = 0; i < 3; i++)
                rgb[i] = Math.round((rgb[i] * 3 + l) / 4);
        }
    }

    return "rgb(" + rgb.join(",") + ")";
}

function getRelNotes(notes) { // 获取各音相对根音的音高
    let relNotes = notes.slice();
    for(let i = 0; i < relNotes.length; i++)
        relNotes[i] -= notes[0];
    return relNotes;
}

function getRelNoteTexts(notes) {
    const natScaleNotes = [0, 2, 4, 5, 7, 9, 11];
    let relNotes = getRelNotes(notes);

    let relNoteTexts = ["1", "3", "5"];
    if(notes.length == 4) { // 七和弦
        relNoteTexts.push("7");
    }

    for(let i = 0; i < relNotes.length; i++) {
        let dTone = (relNotes[i] - natScaleNotes[(i * 2) % 7] + 18) % 12 - 6;
        while(dTone > 0) {
            relNoteTexts[i] = "#" + relNoteTexts[i];
            if(relNoteTexts[i].slice(0, 2) == "##")
                relNoteTexts[i] = "x" + relNoteTexts[i].slice(2);
            dTone--;
        }
        while(dTone < 0) {
            relNoteTexts[i] = "b" + relNoteTexts[i];
            dTone++;
        }
    }

    return relNoteTexts;
}

function findChordDim3(row, col) { // 查找和弦的减三度出现在第几索引的音符
    let notes = getChordNotes(row, col);
    for(let i = 0; i < notes.length - 1; i++) {
        if(notes[i + 1] - notes[i] == 2)
            return i;
    }
    return -1;
}

function rad(deg) {
    return deg / 180 * Math.PI;
}

// 绘制底盘
let Baseplate = document.createElementNS(NS, "g");
let r = 33;
let rLabel = r - 0.5;
for(let i = 0; i < 14; i++) {
    let ang = (i - 1) * 360 / 14;
    let angNext = i * 360 / 14;
    let angLabel = (i - 0.5) * 360 / 14;

    let Path = document.createElementNS(NS, "path");
    let d = `M0 0 ${r * sin(rad(ang))} ${r * -cos(rad(ang))}A${r} ${r} 0 0 1 ${r * sin(rad(angNext))} ${r * -cos(rad(angNext))}Z`;
    Path.setAttribute("d", d);
    Path.setAttribute("fill", (i % 2 == 0 ? "#004080" : "#804000"));
    Baseplate.appendChild(Path);

    let Label = document.createElementNS(NS, "text");
    Label.textContent = ["i", "I", "iii", "III", "v", "V", "vii", "VII", "ii", "II", "iv", "IV", "vi", "VI"][i];
    Label.setAttribute("fill", "#FFFF00");
    Label.setAttribute("style", "font-size: 0.9");
    Label.setAttribute("x", rLabel * sin(rad(angLabel)));
    Label.setAttribute("y", rLabel * -cos(rad(angLabel)));
    Label.setAttribute("transform", `rotate(${angLabel}, ${rLabel * sin(rad(angLabel))}, ${rLabel * -cos(rad(angLabel))})`);
    Baseplate.appendChild(Label);
}
Svg.appendChild(Baseplate);

// 绘制表格，并为单元格添加鼠标高亮事件
function getIfLabelChord(row, col) { // 单元格内是否标注
    let noteTexts = getChordNoteTexts(row, col);
    let notation = getChordNotation(row, col);
    if(fl(row / 4) != 0 && noteTexts.join("") == getChordNoteTexts(row % 4, col).join("")) // 若离调和弦与其对应主调内和弦相同，则不标
        return false;
    if(row % 2 == 1 && notation == getChordNotation(fl(row / 2) * 2, col)) // 若和声调式内的和弦与其对应自然调式内的和弦相同，则不标
        return false;
    if(col % 3 != 1 && notation == getChordNotation(row, fl(col / 3) * 3 + 1)) // 若变音调式内的和弦与其对应原始调式内的和弦相同，则不标
        return false;
    
    return true;
}
let Table = document.createElementNS(NS, "g");
const HL_FILL = {none: "none", highlighted: "rgba(255, 255, 255, 0.25)", selected: "rgba(0, 0, 0, 0.25)", shadowed: "rgba(64, 64, 64, 0.75)", modulating: "rgba(255, 255, 0, 0.5)"}; // 单元格高亮颜色
let g_Cells = [];
for(let row = 0; row < 24; row++) {
    g_Cells[row] = [];
    let r = 32 - row;
    let rNext = r - 1;
    let lineH = 0.45 - 0.01 * row; // 单元格标签行高
    let rLabel1 = r - 0.5 + lineH / 2;
    let rLabel2 = r - 0.5 - lineH / 2;

    for(let col = 0; col < 42; col++) {
        let ang = (col - 3) * 360 / 42;
        let angNext = (col - 2) * 360 / 42;
        let angLabel = (col - 2.5) * 360 / 42;

        let Cell = document.createElementNS(NS, "g"); // 单元格的所有可见元素，包括单元格图形、标签、高亮；鼠标高亮事件也加在Cell上
        let Path = document.createElementNS(NS, "path");
        let d = `M${r * sin(rad(ang))} ${r * -cos(rad(ang))}A${r} ${r} 0 0 1 ${r * sin(rad(angNext))} ${r * -cos(rad(angNext))}L${rNext * sin(rad(angNext))} ${rNext * -cos(rad(angNext))}A${r} ${r} 0 0 0 ${rNext * sin(rad(ang))} ${rNext * -cos(rad(ang))}Z`;
        Path.setAttribute("d", d);
        Path.setAttribute("fill", getNotesColor(getChordNotes(row, col)));
        Cell.appendChild(Path);

        if(getIfLabelChord(row, col)) {
            let Label1 = document.createElementNS(NS, "text");
            Label1.setAttribute("style", `font-size: ${lineH}`);
            Label1.textContent = getChordNotation(row, col);
            Label1.setAttribute("transform", `translate(${rLabel1 * sin(rad(angLabel))}, ${rLabel1 * -cos(rad(angLabel))}) rotate(${angLabel})`);
            Cell.appendChild(Label1);

            let Label2 = document.createElementNS(NS, "text");
            Label2.setAttribute("style", `font-size: ${lineH}`);
            let noteTexts = getChordNoteTexts(row, col);
            let dim3Index = findChordDim3(row, col);
            if(dim3Index == -1) {
                Label2.textContent = noteTexts.join("");
            } else {
                Label2.textContent = noteTexts.slice(0, dim3Index).join("");
                let Tspan = document.createElementNS(NS, "tspan");
                Tspan.setAttribute("fill", "#0000FF");
                Tspan.textContent = noteTexts.slice(dim3Index, dim3Index + 2).join("");
                Label2.appendChild(Tspan);
                Label2.append(noteTexts.slice(dim3Index + 2).join(""));
            }
            Label2.setAttribute("transform", `translate(${rLabel2 * sin(rad(angLabel))}, ${rLabel2 * -cos(rad(angLabel))}) rotate(${angLabel})`);
            Cell.appendChild(Label2);
        }

        // 高亮
        let Hl = document.createElementNS(NS, "path");
        Hl.setAttribute("d", d);
        Hl.setAttribute("fill", HL_FILL.none);
        Hl.setAttribute("pointer-events", "none");
        Cell.appendChild(Hl);
        Cell.Hl = Hl;

        // 鼠标高亮事件
        Cell.addEventListener("mouseover", function() {
            highlight(row, col);
        });
        Cell.addEventListener("mouseout", function() {
            unhighlight();
        });

        Table.appendChild(Cell);
        g_Cells[row][col] = Cell;
    }
}
// 添加经纬线
const LINE_WD = 0.1;
for(let lon = 0; lon < 7; lon++) {
    let ang = (lon - 0.5) * 360 / 7;
    let Lon = document.createElementNS(NS, "path");
    Lon.setAttribute("d", `M0 0 ${32 * sin(rad(ang))} ${32 * -cos(rad(ang))}`);
    Lon.setAttribute("stroke", "#FF0000");
    Lon.setAttribute("stroke-width", LINE_WD);
    Lon.setAttribute("pointer-events", "none");
    Table.appendChild(Lon);
}
for(let lat = 0; lat < 7; lat++) {
    let r = 4 * (8 - lat);
    let Lat = document.createElementNS(NS, "circle");
    Lat.setAttribute("cx", 0);
    Lat.setAttribute("cy", 0);
    Lat.setAttribute("r", r);
    Lat.setAttribute("fill", "none");
    Lat.setAttribute("stroke", "#FF0000");
    Lat.setAttribute("stroke-width", LINE_WD);
    Lat.setAttribute("pointer-events", "none");
    Table.appendChild(Lat);
}
Svg.appendChild(Table);

// 绘制中心部分
let Center = document.createElementNS(NS, "g");
let Circ = document.createElementNS(NS, "circle");
Circ.setAttribute("cx", 0);
Circ.setAttribute("cy", 0);
Circ.setAttribute("r", 8);
Circ.setAttribute("fill", "#FFFFFF");
Center.appendChild(Circ);
function createArrowMark(ang, fill, x, y) {
    let Arr = document.createElementNS(NS, "path");
    Arr.setAttribute("d", "m0 -0.1 0.2 0.4 -0.4 0");
    Arr.setAttribute("fill", fill);
    Arr.setAttribute("transform", `translate(${x}, ${y}) rotate(${ang})`);
    Arr.setAttribute("pointer-events", "painted");
    Arr.setAttribute("style", "cursor: pointer");
    return Arr;
}
for(let i = 0; i < 7; i++) {
    let ang = 360 * i / 7;

    let ArrG1 = document.createElementNS(NS, "g");
    let Arr1 = document.createElementNS(NS, "path");
    Arr1.setAttribute("d", `M${7.4 * sin(rad(ang))} ${7.4 * -cos(rad(ang))}A9 9 0 0 0 ${7.4 * sin(rad(360 * (i + 2) / 7 - 360 * 2 / 168))} ${7.4 * -cos(rad(360 * (i + 2) / 7 - 360 * 2 / 168))}`);
    Arr1.setAttribute("stroke", "#0080FF");
    Arr1.setAttribute("fill", "none");
    Arr1.setAttribute("stroke-width", 0.1);
    Arr1.setAttribute("pointer-events", "painted");
    Arr1.setAttribute("style", "cursor: pointer");
    ArrG1.appendChild(Arr1);
    ArrG1.appendChild(createArrowMark(ang - 360 * 2 / 168, "#0080FF", 7.4 * sin(rad(ang)), 7.4 * -cos(rad(ang))));
    ArrG1.appendChild(createArrowMark(360 * (i + 2) / 7, "#FF8000", 7.4 * sin(rad(360 * (i + 2) / 7 - 360 * 2 / 168)), 7.4 * -cos(rad(360 * (i + 2) / 7 - 360 * 2 / 168))));
    Center.appendChild(ArrG1);
    ArrG1.addEventListener("mousedown", function() {
        if(g_Sel.toString() != "-1,-1") {
            if(fl(g_Sel.col / 6) == i)
                select(g_Sel.row - (fl(g_Sel.row / 2) * 2) % 4, (g_Sel.col + 12) % 42);
            else if(fl(g_Sel.col / 6) == (i + 2) % 7)
                select(g_Sel.row - (fl(g_Sel.row / 2) * 2) % 4, (g_Sel.col + 30) % 42);
        }
    });

    let ArrG2 = document.createElementNS(NS, "g");
    let Arr2 = document.createElementNS(NS, "path");
    Arr2.setAttribute("d", `M${7.4 * sin(rad(ang + 360 * 2 / 168))} ${7.4 * -cos(rad(ang + 360 * 2 / 168))}A12.5 12.5 0 0 1 ${4.9 * sin(rad(360 * (i + 1) / 7 + 255 / 49))} ${4.9 * -cos(rad(360 * (i + 1) / 7 + 255 / 49))}`);
    Arr2.setAttribute("stroke", "#FF8000");
    Arr2.setAttribute("fill", "none");
    Arr2.setAttribute("stroke-width", 0.1);
    Arr2.setAttribute("pointer-events", "painted");
    Arr2.setAttribute("style", "cursor: pointer");
    ArrG2.appendChild(Arr2);
    ArrG2.appendChild(createArrowMark(360 * (i - 1) / 7, "#0080FF", 7.4 * sin(rad(ang + 360 * 2 / 168)), 7.4 * -cos(rad(ang + 360 * 2 / 168))));
    Center.appendChild(ArrG2);
    ArrG2.addEventListener("mousedown", function() {
        if(g_Sel.toString() != "-1,-1") {
            if(fl(g_Sel.col / 6) == i)
                select(g_Sel.row - (fl(g_Sel.row / 2) * 2) % 4, (g_Sel.col + 18) % 42);
            else if(fl(g_Sel.col / 6) == (i + 3) % 7)
                select(g_Sel.row - (fl(g_Sel.row / 2) * 2) % 4, (g_Sel.col + 24) % 42);
        }
    });

    let ArrG3 = document.createElementNS(NS, "g");
    let Arr3 = document.createElementNS(NS, "path");
    Arr3.setAttribute("d", `M${7.4 * sin(rad(ang + 360 * 4 / 168))} ${7.4 * -cos(rad(ang + 360 * 4 / 168))}L ${7.4 * sin(rad(360 * (i + 1) / 7 - 360 * 4 / 168))} ${7.4 * -cos(rad(360 * (i + 1) / 7 - 360 * 4 / 168))}`);
    Arr3.setAttribute("stroke", "#FF8000");
    Arr3.setAttribute("fill", "none");
    Arr3.setAttribute("stroke-width", 0.1);
    Arr3.setAttribute("pointer-events", "painted");
    Arr3.setAttribute("style", "cursor: pointer");
    ArrG3.appendChild(Arr3);
    ArrG3.appendChild(createArrowMark(360 * (i + 0.5) / 7 - 90, "#FF8000", 7.4 * sin(rad(ang + 360 * 4 / 168)), 7.4 * -cos(rad(ang + 360 * 4 / 168))));
    ArrG3.appendChild(createArrowMark(360 * (i + 0.5) / 7 + 90, "#FF8000", 7.4 * sin(rad(360 * (i + 1) / 7 - 360 * 4 / 168)), 7.4 * -cos(rad(360 * (i + 1) / 7 - 360 * 4 / 168))));
    Center.appendChild(ArrG3);
    ArrG3.addEventListener("mousedown", function() {
        if(g_Sel.toString() != "-1,-1") {
            if(fl(g_Sel.col / 6) == i)
                select(g_Sel.row - (fl(g_Sel.row / 2) * 2) % 4, (g_Sel.col + 6) % 42);
            else if(fl(g_Sel.col / 6) == (i + 1) % 7)
                select(g_Sel.row - (fl(g_Sel.row / 2) * 2) % 4, (g_Sel.col + 36) % 42);
        }
    });
}
Svg.appendChild(Center);

function showChordInfo(row, col, Box) {
    Box.style.backgroundColor = getNotesColor(getChordNotes(row, col));
    Box.innerHTML = getChordNotation(row, col) + "<br>";
    let noteTexts = getChordNoteTexts(row, col);
    let dim3Index = findChordDim3(row, col);
    if(dim3Index == -1) {
        Box.innerHTML += noteTexts.join("");
    } else {
        Box.innerHTML += noteTexts.slice(0, dim3Index).join("");
        let Span = document.createElement("span");
        Span.style.color = "#0000FF";
        Span.textContent = noteTexts.slice(dim3Index, dim3Index + 2).join("");
        Box.appendChild(Span);
        Box.append(noteTexts.slice(dim3Index + 2).join(""));
    }
    
    if(Box == DChordBox) {
        DChordDescription.innerHTML = "";
        if(fl(row / 4) != 0)
            DChordDescription.append("向");
        DChordDescription.append((fl(col / 3) % 2 == 1 ? "大调" : "小调"));
        switch(fl(row / 4)) {
        case 1:
            DChordDescription.append((fl(col / 3) % 2 == 1 ? "DT" : "dt")); break;
        case 2:
            DChordDescription.append((fl(col / 3) % 2 == 1 ? "D" : "d")); break;
        case 3:
            DChordDescription.append((fl(col / 3) % 2 == 1 ? "SII" : "dVII")); break;
        case 4:
            DChordDescription.append((fl(col / 3) % 2 == 1 ? "S" : "s")); break;
        case 5:
            DChordDescription.append((fl(col / 3) % 2 == 1 ? "TS" : "ts")); break;
        }
        DChordDescription.append((row % 2 == 0 ? "自然调式" : "和声调式"));
        DChordDescription.append((fl(row / 4) == 0 ? "调内" : "离调的"));
        DChordDescription.append((fl(row / 2) % 2 == 0 ? "三和弦" : "七和弦"));
        switch(col % 6) {
        case 0:
            DChordDescription.append((fl(row / 4) % 2 == 0 ? "，降调式四级变和弦" : "，升调式二级变和弦")); break;
        case 2:
        case 3:
            DChordDescription.append("，降调式二级变和弦"); break;
        case 5:
            DChordDescription.append((fl(row / 4) % 2 == 0 ? "，升调式二级变和弦" : "，降调式四级变和弦")); break;
        }
    }
}

function clearChordInfo(Box) {
    Box.style.backgroundColor = "transparent";
    Box.innerHTML = "<br><br>"
    if(Box == DChordBox)
        DChordDescription.innerHTML = "";
}

function highlight(row, col) {
    g_Hl.row = row;
    g_Hl.col = col;

    if(!g_isDragging) {
        if(g_Sel.toString() != g_Hl.toString())
            g_Cells[row][col].Hl.setAttribute("fill", HL_FILL.highlighted);
        showChordInfo(row, col, DChordBox);
    } else {
        if(g_Cells[row][col].Hl.getAttribute("fill") != HL_FILL.shadowed) {
            g_Cells[row][col].Hl.removeAttribute("visibility");
            g_Cells[row][col].Hl.setAttribute("fill", HL_FILL.modulating);
            showChordInfo(row, col, DAfterModulBox);
        }
    }
}

function unhighlight() {
    if(!g_isDragging) {
        if(g_Sel.toString() != g_Hl.toString())
            g_Cells[g_Hl.row][g_Hl.col].Hl.setAttribute("fill", HL_FILL.none);
        if(g_Sel.toString() == "-1,-1")
            clearChordInfo(DChordBox);
        else
            showChordInfo(g_Sel.row, g_Sel.col, DChordBox);
    } else {
        if(g_Cells[g_Hl.row][g_Hl.col].Hl.getAttribute("fill") != HL_FILL.shadowed) {
            g_Cells[g_Hl.row][g_Hl.col].Hl.setAttribute("fill", (g_Hl.toString() == g_Sel.toString() ? HL_FILL.selected : HL_FILL.none));
            clearChordInfo(DAfterModulBox);
        }
    }

    g_Hl.row = -1;
    g_Hl.col = -1;
}

let flashingLoopID;
function flashingLoop() { // 选定单元格闪烁动画
    if(g_Cells[g_Sel.row][g_Sel.col].Hl.getAttribute("fill") == HL_FILL.selected) {
        (g_Cells[g_Sel.row][g_Sel.col].Hl.getAttribute("visibility") == null ? g_Cells[g_Sel.row][g_Sel.col].Hl.setAttribute("visibility", "hidden") : g_Cells[g_Sel.row][g_Sel.col].Hl.removeAttribute("visibility"));
    }
}

function select(row, col) {
    if(g_Sel.toString() != "-1,-1")
        unselect();
    g_Sel.row = row;
    g_Sel.col = col;

    g_Cells[row][col].Hl.setAttribute("fill", HL_FILL.selected);
    playNotes(getChordNotes(row, col));

    if(g_Hl.toString() == "-1,-1")
        showChordInfo(row, col, DChordBox);

    flashingLoopID = setInterval(flashingLoop, 500);
}

function unselect() {
    clearInterval(flashingLoopID);
    g_Cells[g_Sel.row][g_Sel.col].Hl.removeAttribute("visibility");
    if(g_Sel.toString() == g_Hl.toString()) {
        g_Cells[g_Sel.row][g_Sel.col].Hl.setAttribute("fill", HL_FILL.highlighted);
    } else {
        g_Cells[g_Sel.row][g_Sel.col].Hl.setAttribute("fill", HL_FILL.none);
    }
    stopNotes();

    if(g_Hl.toString() == "-1,-1")
        clearChordInfo(DChordBox);

    g_Sel.row = -1;
    g_Sel.col = -1;
}

BReset.onclick = function() {
    if(g_Sel.toString() != "-1,-1")
        unselect();
    g_curModulNSharp = 0;
    g_curRotateSector = 0;
    setCurKey();
    Table.setAttribute("transform", "rotate(0)");
    Center.setAttribute("transform", "rotate(0)");
}

let g_isOutsideCenter = true;
Center.addEventListener("mouseout", function() { g_isOutsideCenter = true; });
Center.addEventListener("mouseover", function() { g_isOutsideCenter = false; });
let g_isCellMouseDown = false; // 是否在单元格上按住鼠标
let g_isDragging = false;
let g_x0, g_y0; // 转调拖动前的鼠标坐标

DRight.addEventListener("mousedown", function(e) {
    // 若在空白区域点击且当前有选择的单元格，则取消选择
    if(g_Sel.toString() != "-1,-1" && g_Hl.toString() == "-1,-1" && g_isOutsideCenter)
        unselect();

    if(g_Hl.toString() != "-1,-1") {
        // 若在单元格上点击则选择该单元格，或再次点击取消选择
        if(g_Sel.toString() == g_Hl.toString())
            unselect();
        else
            select(g_Hl.row, g_Hl.col);

        g_isCellMouseDown = true;
        g_x0 = e.offsetX;
        g_y0 = e.offsetY;
    }
});

let g_TempCell;
DRight.addEventListener("mousemove", function(e) {
    if(!g_isCellMouseDown)
        return;

    if(!g_isDragging) { // 转调拖动开始时
        g_isDragging = true;
        if(g_Sel.toString() != "-1,-1")
            g_Cells[g_Sel.row][g_Sel.col].Hl.removeAttribute("visibility");
        if(g_Sel.toString() == "-1,-1") // 若此时和弦单元格被再次点击取消选中，则重新选中
            select(g_Hl.row, g_Hl.col);
        g_Cells[g_Sel.row][g_Sel.col].Hl.setAttribute("fill", HL_FILL.none); // 因为克隆节点时无法克隆其新增属性，故先取消高亮
        g_TempCell = g_Cells[g_Sel.row][g_Sel.col].cloneNode(true);
        g_Cells[g_Sel.row][g_Sel.col].Hl.setAttribute("fill", HL_FILL.selected);
        g_TempCell.setAttribute("pointer-events", "none");
        Table.appendChild(g_TempCell);
        showChordInfo(g_Sel.row, g_Sel.col, DBeforeModulBox);
        // 为不满足转调条件（组成音相对音高一致但绝对音高不同）的和弦单元格添加阴影
        for(let row = 0; row < 24; row++) {
            for(let col = 0; col < 42; col++) {
                if(getRelNotes(getChordNotes(row, col)).join() != getRelNotes(getChordNotes(g_Sel.row, g_Sel.col)).join() || getChordNotes(row, col).join() == getChordNotes(g_Sel.row, g_Sel.col).join())
                    g_Cells[row][col].Hl.setAttribute("fill", HL_FILL.shadowed);
            }
        }
    }

    let dX = e.offsetX - g_x0;
    let dY = e.offsetY - g_y0;
    let r = Math.sqrt(dX * dX + dY * dY) * 66 / SVG_WIDTH;
    let angRad = Math.atan2(dY, dX) - rad(g_curRotateSector * 360 / 7);
    g_TempCell.setAttribute("transform", `translate(${r * cos(angRad)}, ${r * sin(angRad)})`);
});

// 以自然大调式一级音为始，转向以各扇区音为主音的大调时的音高差与升号数差，将其作为标准以计算转调前后的升号数差
NatMajModulDeltas = [{"dTone": 0, "dNSharp": 0}, {"dTone": 4, "dNSharp": 4}, {"dTone": 7, "dNSharp": 1}, {"dTone": 11, "dNSharp": 5}, {"dTone": 2, "dNSharp": 2}, {"dTone": 5, "dNSharp": -1}, {"dTone": 9, "dNSharp": 3}];
DRight.addEventListener("mouseup", function() {
    g_isCellMouseDown = false;

    if(g_isDragging) { // 转调拖动完成时
        g_isDragging = false;
        Table.removeChild(g_TempCell);
        clearChordInfo(DBeforeModulBox);
        clearChordInfo(DAfterModulBox);

        if(g_Hl.toString() != "-1,-1" && g_Cells[g_Hl.row][g_Hl.col].Hl.getAttribute("fill") == HL_FILL.modulating) { // 若鼠标位于可转调和弦，实行转调操作
            let dSector;
            let dTone;
            let dNSharp;
            if(!g_isEnharmonic) {
                dSector = (fl(g_Sel.col / 6) - fl(g_Hl.col / 6) + 7) % 7;
                dTone = (getChordNotes(g_Sel.row, g_Sel.col)[0] - getChordNotes(g_Hl.row, g_Hl.col)[0] + 12) % 12;
            } else {
                g_isEnharmonic = false;
                TEnharmonic.innerHTML = "";

                const chordInvDSectors = (getChordNotes(g_Sel.row, g_Sel.col).length == 4 ? [0, 1, 5, 6] : [0, 1, 6]); // 规定可等音转调的和弦各转位相对其原位的扇区差

                dSector = (fl(g_Sel.col / 6) - fl(g_Hl.col / 6) + chordInvDSectors[(getChordNotes(g_Sel.row, g_Sel.col).length == 4 ? (g_curEnhInvOrd - g_iniEnhInvOrd + 4) % 4 : g_curEnhInvOrd - g_iniEnhInvOrd)] + 7) % 7;
                dTone = (g_invNotes[0] - getChordNotes(g_Hl.row, g_Hl.col)[0] + 12) % 12;
            }
            dNSharp = NatMajModulDeltas[dSector].dNSharp + ((dTone - NatMajModulDeltas[dSector].dTone + 18) % 12 - 6) * 7;

            g_curRotateSector = (g_curRotateSector + dSector) % 7;
            g_curModulNSharp += dNSharp;

            Table.setAttribute("transform", `rotate(${g_curRotateSector * 360 / 7})`);
            Center.setAttribute("transform", `rotate(${g_curRotateSector * 360 / 7})`);
            unselect();
            setCurKey();
            select(g_Hl.row, g_Hl.col);
        } else if(g_isEnharmonic) {
            g_isEnharmonic = false;
            stopNotes();
            playNotes(getChordNotes(g_Sel.row, g_Sel.col));
            TEnharmonic.innerHTML = "";
        }

        // 为单元格取消阴影
        for(let row = 0; row < 24; row++) {
            for(let col = 0; col < 42; col++) {
                if(g_Cells[row][col].Hl.getAttribute("fill") == HL_FILL.shadowed || g_Cells[row][col].Hl.getAttribute("fill") == HL_FILL.modulating)
                    g_Cells[row][col].Hl.setAttribute("fill", (row + "," + col == g_Sel.toString() ? HL_FILL.selected : (row + "," + col == g_Hl.toString() ? HL_FILL.highlighted : HL_FILL.none)));
            }
        }
    }
});

let g_isEnharmonic = false;
let g_iniEnhInvOrd; // 对于各类含减三度的七和弦，其相当于其对应等音含小七度的七和弦的第几转位
let g_curEnhInvOrd; // 可用于等音转调的和弦的当前转位序数（对于各类含减三度的七和弦，相当于其对应等音含小七度的七和弦的）
let g_invNotes;
const CHORD_AVAIL_ENH_INV_ORDS = { // 可用于等音转调的和弦的各可用于等音转调的转位序数（将各类含减三度的七和弦与其对应等音含小七度的七和弦视作同一类）
    "135b7": [0, 2, 3],
    "1b35b7": [0, 1, 3],
    "1b3b5b7": [0, 1, 2],
    "13b5b7": [0, 2],
    "13#5b7": [0, 3],
    "1b3b5bb7": [0, 1, 2, 3],
    "13#5": [0, 1, 2]
};

function invertNotes(notes, ord) {
    let invNotes = notes.slice();
    for(let i = 0; i < ord; i++)
        invNotes.push(invNotes.shift() + 12);
    // 调整一下八度，使根音的相对音高大于等于7（即自然五级音）的和弦降低一个八度，以限定和弦的音高范围。
    if(invNotes[0] >= 7) {
        for(let i = 0; i < invNotes.length; i++)
            invNotes[i] -= 12;
    }
    return invNotes;
}

function invertNoteTexts(noteTexts, ord) {
    let invNoteTexts = noteTexts.slice();
    for(let i = 0; i < ord; i++)
        invNoteTexts.push(invNoteTexts.shift());
    return invNoteTexts;
}

function getEnhChordAndEnhInvOrd(row, col) { // 获取和弦属于哪一类可用于等音转调的和弦，并对于各类含减三度的七和弦，获取其相当于其对应等音含小七度的七和弦的第几转位
    let notes = getChordNotes(row, col);
    let invNotes = notes.slice();
    let enhChord;
    let enhInvOrd = notes.length;
    do {
        let relNoteTexts = getRelNoteTexts(invNotes);
        if(CHORD_AVAIL_ENH_INV_ORDS[relNoteTexts.join("")] != undefined) {
            enhChord = relNoteTexts.join("");
            break;
        }
        invNotes = invertNotes(invNotes, 1);
        enhInvOrd--;
    } while(enhInvOrd > 0);
    return {"enhChord": enhChord, "enhInvOrd": enhInvOrd % notes.length};
}

document.addEventListener("keydown", function(e) {
    switch(e.key) {
    case "ArrowDown":
        if(g_Sel.toString() != "-1,-1")
            (e.ctrlKey ? select((g_Sel.row + 4) % 24, g_Sel.col) : select((g_Sel.row + 1) % 24, g_Sel.col));
        e.preventDefault(); break;
    case "ArrowUp":
        if(g_Sel.toString() != "-1,-1")
            (e.ctrlKey ? select((g_Sel.row + 20) % 24, g_Sel.col) : select((g_Sel.row + 23) % 24, g_Sel.col));
        e.preventDefault(); break;
    case "ArrowRight":
        if(g_Sel.toString() != "-1,-1")
            (e.ctrlKey ? select(g_Sel.row, (g_Sel.col + 6) % 42) : select(g_Sel.row, (g_Sel.col + 1) % 42));
        e.preventDefault(); break;
    case "ArrowLeft":
        if(g_Sel.toString() != "-1,-1")
            (e.ctrlKey ? select(g_Sel.row, (g_Sel.col + 36) % 42) : select(g_Sel.row, (g_Sel.col + 41) % 42));
        e.preventDefault(); break;
    case "Enter":
        if(!g_isCellMouseDown)
            break;

        if(g_Sel.toString() == "-1,-1" && getEnhChordAndEnhInvOrd(g_Hl.row, g_Hl.col).enhChord != undefined) // 若此时可用于等音转调的和弦单元格被再次点击取消选中，则重新选中
            select(g_Hl.row, g_Hl.col);
        
        if(g_Sel.toString() == "-1,-1" || getEnhChordAndEnhInvOrd(g_Sel.row, g_Sel.col).enhChord == undefined)
            break;

        // 触发等音转调
        let enhChord;
        ({enhChord, enhInvOrd: g_iniEnhInvOrd} = getEnhChordAndEnhInvOrd(g_Sel.row, g_Sel.col));
        let notes = getChordNotes(g_Sel.row, g_Sel.col);
        let noteTexts = getChordNoteTexts(g_Sel.row, g_Sel.col);
        let invNoteTexts;

        if(!g_isDragging) {
            g_isDragging = true;
            g_Cells[g_Sel.row][g_Sel.col].Hl.removeAttribute("visibility");
            g_Cells[g_Sel.row][g_Sel.col].Hl.setAttribute("fill", HL_FILL.none); // 因为克隆节点时无法克隆其新增属性，故先取消高亮
            g_TempCell = g_Cells[g_Sel.row][g_Sel.col].cloneNode(true);
            g_Cells[g_Sel.row][g_Sel.col].Hl.setAttribute("fill", HL_FILL.selected);
            g_TempCell.setAttribute("pointer-events", "none");
            Table.appendChild(g_TempCell);
        }

        if(!g_isEnharmonic) {
            g_isEnharmonic = true;
            g_curEnhInvOrd = g_iniEnhInvOrd;
            TEnharmonic.innerHTML = "（等音转调）";
        }

        // 获取前一个可用于等音转调的转位序数（向下转位）
        stopNotes();
        g_curEnhInvOrd = CHORD_AVAIL_ENH_INV_ORDS[enhChord][(CHORD_AVAIL_ENH_INV_ORDS[enhChord].indexOf(g_curEnhInvOrd) - 1 + CHORD_AVAIL_ENH_INV_ORDS[enhChord].length) % CHORD_AVAIL_ENH_INV_ORDS[enhChord].length];
        let curInvOrd = (g_curEnhInvOrd - g_iniEnhInvOrd + notes.length) % notes.length;

        if(g_curEnhInvOrd != g_iniEnhInvOrd) { // 非转回了原位
            g_invNotes = invertNotes(notes, (g_curEnhInvOrd - g_iniEnhInvOrd + notes.length) % notes.length);
            invNoteTexts = invertNoteTexts(noteTexts, curInvOrd);
            playNotes(g_invNotes);

            let invNotation = getChordNotation(g_Sel.row, g_Sel.col);
            if(notes.length == 4) {
                invNotation = invNotation.replace(/7(?=\/|$)/, ["7", "56", "34", "2"][g_curEnhInvOrd]);
            } else {
                invNotation = invNotation.replace(/(?=\/|$)/, ["", "6", "46"][g_curEnhInvOrd]);
            }

            // 显示转位和弦信息
            clearChordInfo(DBeforeModulBox);
            DBeforeModulBox.style.backgroundColor = getNotesColor(g_invNotes);
            DBeforeModulBox.innerHTML = invNotation + "<br>";
            let dim3Index = findChordDim3(g_Sel.row, g_Sel.col);
            if(dim3Index == -1) {
                DBeforeModulBox.innerHTML += invNoteTexts.join("");
            } else {
                let invDim3Index = (dim3Index - curInvOrd + 4) % 4;
                if(invDim3Index != 3) {
                    DBeforeModulBox.innerHTML += invNoteTexts.slice(0, invDim3Index).join("");
                    let Span = document.createElement("span");
                    Span.style.color = "#0000FF";
                    Span.textContent = invNoteTexts.slice(invDim3Index, invDim3Index + 2).join("");
                    DBeforeModulBox.appendChild(Span);
                    DBeforeModulBox.append(invNoteTexts.slice(invDim3Index + 2).join(""));
                } else {
                    let Span1 = document.createElement("span");
                    Span1.style.color = "#0000FF";
                    Span1.textContent = invNoteTexts[0];
                    DBeforeModulBox.appendChild(Span1);
                    DBeforeModulBox.append(invNoteTexts.slice(1, 3).join(""));
                    let Span2 = document.createElement("span");
                    Span2.style.color = "#0000FF";
                    Span2.textContent = invNoteTexts[3];
                    DBeforeModulBox.appendChild(Span2);
                }
            }

            // 为单元格取消旧阴影并添加新阴影
            for(let row = 0; row < 24; row++) {
                for(let col = 0; col < 42; col++) {
                    if(g_Cells[row][col].Hl.getAttribute("fill") == HL_FILL.shadowed || g_Cells[row][col].Hl.getAttribute("fill") == HL_FILL.modulating)
                        g_Cells[row][col].Hl.setAttribute("fill", (row + "," + col == g_Sel.toString() ? HL_FILL.selected : HL_FILL.none));

                    if(getRelNotes(getChordNotes(row, col)).join() != getRelNotes(g_invNotes).join()) {
                        g_Cells[row][col].Hl.setAttribute("fill", HL_FILL.shadowed);
                        if(row + "," + col == g_Hl.toString()) // 若转位后鼠标所在单元格和弦由可转调的变为不可转调的
                            clearChordInfo(DAfterModulBox);
                    } else if(row + "," + col == g_Hl.toString()) { // 若转位后鼠标所在单元格和弦可转调
                        g_Cells[row][col].Hl.removeAttribute("visibility");
                        g_Cells[row][col].Hl.setAttribute("fill", HL_FILL.modulating);
                        showChordInfo(row, col, DAfterModulBox);
                    }
                }
            }
        } else { // 转回了原位，切回非等音转调模式
            g_isEnharmonic = false;
            playNotes(notes);
            showChordInfo(g_Sel.row, g_Sel.col, DBeforeModulBox);
            TEnharmonic.innerHTML = "";
            g_Cells[g_Sel.row][g_Sel.col].Hl.removeAttribute("visibility");

            // 为单元格取消旧阴影并添加新阴影
            for(let row = 0; row < 24; row++) {
                for(let col = 0; col < 42; col++) {
                    if(g_Cells[row][col].Hl.getAttribute("fill") == HL_FILL.shadowed || g_Cells[row][col].Hl.getAttribute("fill") == HL_FILL.modulating)
                        g_Cells[row][col].Hl.setAttribute("fill", (row + "," + col == g_Sel.toString() ? HL_FILL.selected : HL_FILL.none));

                    if(getRelNotes(getChordNotes(row, col)).join() != getRelNotes(notes).join() || getChordNotes(row, col).join() == notes.join()) {
                        g_Cells[row][col].Hl.setAttribute("fill", HL_FILL.shadowed);
                        if(row + "," + col == g_Hl.toString()) // 若转位后鼠标所在单元格和弦由可转调的变为不可转调的
                            clearChordInfo(DAfterModulBox);
                    } else if(row + "," + col == g_Hl.toString()) { // 若转位后鼠标所在单元格和弦可转调
                        g_Cells[row][col].Hl.setAttribute("fill", HL_FILL.modulating);
                        showChordInfo(row, col, DAfterModulBox);
                    }
                }
            }
        }
        e.preventDefault(); break;
    }
});