const { default: makeWASocket, useMultiFileAuthState, delay, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const readline = require('readline');

// ==========================================
// DEFAULT SETTINGS
// ==========================================
let PHONE_NUMBER = "923123456789"; // Apna Default Number
let GROUP_NAME = "your group name";    // Apne Group ka Default Naam

// Colors for Beautiful UI
const C = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    magenta: "\x1b[35m",
    blue: "\x1b[34m"
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Khoobsurat aur Bada "RAYYAN" Banner
function showBanner() {
    console.clear();
    console.log(C.cyan + C.bright + `
  ██████╗  █████╗ ██╗   ██╗██╗   ██╗ █████╗ ███╗   ██╗
  ██╔══██╗██╔══██╗╚██╗ ██╔╝╚██╗ ██╔╝██╔══██╗████╗  ██║
  ██████╔╝███████║ ╚████╔╝  ╚████╔╝ ███████║██╔██╗ ██║
  ██╔══██╗██╔══██║  ╚██╔╝    ╚██╔╝  ██╔══██║██║╚██╗██║
  ██║  ██║██║  ██║   ██║      ██║   ██║  ██║██║ ╚████║
  ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═══╝` + C.reset);
    console.log(C.magenta + `  ====================================================`);
    console.log(C.yellow + C.bright + `       ★ RAYYAN PRO WHATSAPP BOT & TOOLS V3 ★         `);
    console.log(C.magenta + `  ====================================================\n` + C.reset);
}

// Normal Text MCQs ko Auto-Detect karne wala Function
function parseRawMCQs(rawText) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l !== '');
    const mcqs = [];
    let currentQ = null;

    for (const line of lines) {
        if (/^[A-Da-d][\.\)]\s+/.test(line)) {
            if (currentQ) {
                currentQ.options.push(line);
            }
        } else {
            if (currentQ && currentQ.options.length >= 2) {
                mcqs.push(currentQ);
            }
            currentQ = { question: line, options: [] };
        }
    }
    if (currentQ && currentQ.options.length >= 2) {
        mcqs.push(currentQ);
    }
    return mcqs;
}

// Group mein Polls Send karne ka Function
async function sendPollsToGroup(sock, mcqsList) {
    console.log(C.cyan + `\n[•] Group "${GROUP_NAME}" dhoonda ja raha hai...` + C.reset);

    const groups = await sock.groupFetchAllParticipating();
    const groupList = Object.values(groups);
    const targetGroup = groupList.find(g => g.subject.toLowerCase() === GROUP_NAME.toLowerCase());

    if (!targetGroup) {
        console.log(C.red + `\n[!] Error: Group "${GROUP_NAME}" nahi mila! Button [4] se naam check karein.` + C.reset);
        return showMenu(sock);
    }

    console.log(C.green + `[✔] Group mil gaya: "${targetGroup.subject}"`);
    console.log(`[🚀] Total ${mcqsList.length} MCQs Polls bhejna shuru kar rahe hain...\n` + C.reset);

    for (let i = 0; i < mcqsList.length; i++) {
        const item = mcqsList[i];

        await sock.sendMessage(targetGroup.id, {
            poll: {
                name: item.question,
                values: item.options.slice(0, 12),
                selectableCount: 1
            }
        });

        console.log(C.yellow + `[✔] Poll ${i + 1}/${mcqsList.length} Sent:` + C.reset + ` ${item.question.substring(0, 40)}...`);

        if (i < mcqsList.length - 1) {
            await delay(12000); // 12 seconds delay
        }
    }

    console.log(C.green + C.bright + `\n🎉 MUBARAK HO! Tamam ${mcqsList.length} MCQs Polls group mein bhej diye gaye hain!\n` + C.reset);
    showMenu(sock);
}

// Interactive Menu (Buttons)
function showMenu(sock) {
    console.log(C.cyan + `  ┌──────────────────────────────────────────────────────┐`);
    console.log(`  │                   ${C.bright}${C.yellow}MAIN MENU BUTTONS${C.reset}${C.cyan}                  │`);
    console.log(`  ├──────────────────────────────────────────────────────┤`);
    console.log(`  │ ${C.green}[1]${C.reset} 📋 Paste MCQs & Auto Send (Direct Enter)         ${C.cyan}│`);
    console.log(`  │ ${C.green}[2]${C.reset} 📁 Send MCQs from mcqs.json File                 ${C.cyan}│`);
    console.log(`  │ ${C.green}[3]${C.reset} 💬 Send Custom Message to Any Number (Repeater)  ${C.cyan}│`);
    console.log(`  │ ${C.green}[4]${C.reset} ✏️  Change Group Name (${C.yellow}${GROUP_NAME}${C.reset})              ${C.cyan}│`);
    console.log(`  │ ${C.green}[5]${C.reset} 📱 Add / Link New Bot WhatsApp Number            ${C.cyan}│`);
    console.log(`  │ ${C.red}[0]${C.reset} ❌ Exit Bot                                      ${C.cyan}│`);
    console.log(`  └──────────────────────────────────────────────────────┘` + C.reset);

    rl.question(C.bright + `\n👉 Apna Option Select Karein (0-5): ` + C.reset, async (choice) => {
        const opt = choice.trim();

        // BUTTON 1: Direct Paste & Enter
        if (opt === '1') {
            console.log(C.magenta + `\n======================================================`);
            console.log(C.yellow + `📋 Apne MCQs yahan Paste karein aur bas ` + C.bright + `ENTER` + C.reset + C.yellow + ` daba dein!`);
            console.log(C.green + `(Koi 'SEND' likhne ki zaroorat nahi, bot khud detect kar lega)`);
            console.log(C.magenta + `======================================================\n` + C.reset);

            let rawInput = '';
            let pasteTimer = null;

            const finishPaste = async () => {
                rl.removeListener('line', onLine);
                const parsedMCQs = parseRawMCQs(rawInput);

                if (parsedMCQs.length === 0) {
                    console.log(C.red + `\n[!] Koi sahi MCQ detect nahi hua! (Options A. B. C. D. hone chahiye).` + C.reset);
                    return showMenu(sock);
                }

                console.log(C.green + `\n[✔] Zabardast! ${parsedMCQs.length} MCQs auto-detect ho gaye hain!` + C.reset);
                await sendPollsToGroup(sock, parsedMCQs);
            };

            const onLine = (line) => {
                rawInput += line + '\n';
                // Jaise hi paste rukega, 1.2 second baad auto-send shuru ho jayega
                if (pasteTimer) clearTimeout(pasteTimer);
                pasteTimer = setTimeout(() => {
                    if (rawInput.trim() !== '') {
                        finishPaste();
                    }
                }, 1200);
            };

            rl.on('line', onLine);

        // BUTTON 2: JSON File
        } else if (opt === '2') {
            if (!fs.existsSync('./mcqs.json')) {
                console.log(C.red + `\n[!] mcqs.json file nahi mili!` + C.reset);
                return showMenu(sock);
            }
            try {
                const fileMcqs = JSON.parse(fs.readFileSync('./mcqs.json', 'utf8'));
                await sendPollsToGroup(sock, fileMcqs);
            } catch (err) {
                console.log(C.red + `\n[!] mcqs.json file mein koi ghalti hai!` + C.reset);
                showMenu(sock);
            }

        // BUTTON 3: Custom Message Sender to Any Number
        } else if (opt === '3') {
            rl.question(C.yellow + `\n📞 Jisko message bhejna hai uska Number likhein (e.g. 923001234567): ` + C.reset, (targetNum) => {
                let cleanNum = targetNum.replace(/[^0-9]/g, '');
                if (cleanNum.startsWith('03')) {
                    cleanNum = '92' + cleanNum.substring(1); // Agar 03.. likha ho to khud 923.. kar dega
                }

                if (cleanNum.length < 10) {
                    console.log(C.red + `\n[!] Ghalat number likha hai!\n` + C.reset);
                    return showMenu(sock);
                }

                rl.question(C.yellow + `💬 Kya Message send karna hai? Yahan likhein: ` + C.reset, (msgText) => {
                    if (!msgText.trim()) {
                        console.log(C.red + `\n[!] Khali message send nahi ho sakta!\n` + C.reset);
                        return showMenu(sock);
                    }

                    rl.question(C.yellow + `🔢 Kitni baar (How many times) send karna hai? (e.g. 1, 5, 20): ` + C.reset, async (countStr) => {
                        const count = parseInt(countStr.trim(), 10);
                        if (isNaN(count) || count <= 0) {
                            console.log(C.red + `\n[!] Sahi tadad (number) likhein!\n` + C.reset);
                            return showMenu(sock);
                        }

                        const jid = `${cleanNum}@s.whatsapp.net`;
                        console.log(C.cyan + `\n[🚀] ${cleanNum} par ${count} messages bheje ja rahe hain...\n` + C.reset);

                        for (let i = 0; i < count; i++) {
                            try {
                                await sock.sendMessage(jid, { text: msgText });
                                console.log(C.green + `[✔] Message ${i + 1}/${count} Sent to ${cleanNum}` + C.reset);
                                if (i < count - 1) {
                                    await delay(2500); // 2.5 seconds gap taake WhatsApp ban na ho
                                }
                            } catch (e) {
                                console.log(C.red + `[!] Message bhejne mein error aaya: ${e.message}` + C.reset);
                                break;
                            }
                        }

                        console.log(C.green + C.bright + `\n✅ Tamam (${count}) messages kamyabi se send ho gaye!\n` + C.reset);
                        showMenu(sock);
                    });
                });
            });

        // BUTTON 4: Change Group Name
        } else if (opt === '4') {
            rl.question(C.yellow + `\n✏️  Apne WhatsApp Group ka naya naam likhein: ` + C.reset, (newName) => {
                if (newName.trim() !== '') {
                    GROUP_NAME = newName.trim();
                    console.log(C.green + `[✔] Group ka naam update ho kar "${GROUP_NAME}" ho gaya!\n` + C.reset);
                }
                showMenu(sock);
            });

        // BUTTON 5: Add / Link New Bot Number
        } else if (opt === '5') {
            rl.question(C.yellow + `\n📱 Naya WhatsApp Number likhein (Country code ke sath, e.g. 923001234567): ` + C.reset, async (newBotNum) => {
                let cleanBotNum = newBotNum.replace(/[^0-9]/g, '');
                if (cleanBotNum.startsWith('03')) {
                    cleanBotNum = '92' + cleanBotNum.substring(1);
                }

                if (cleanBotNum.length < 10) {
                    console.log(C.red + `\n[!] Sahi number likhein!\n` + C.reset);
                    return showMenu(sock);
                }

                PHONE_NUMBER = cleanBotNum;
                console.log(C.cyan + `\n[•] Purana session hataya ja raha hai aur naya number (${PHONE_NUMBER}) link ho raha hai...` + C.reset);

                try {
                    sock.ev.removeAllListeners();
                    if (fs.existsSync('./auth_info')) {
                        fs.rmSync('./auth_info', { recursive: true, force: true });
                    }
                } catch (e) {}

                isMenuOpen = false;
                await delay(1500);
                startBot(true);
            });

        // BUTTON 0: Exit
        } else if (opt === '0') {
            console.log(C.green + `\nAllah Hafiz Rayyan! Bot band kiya ja raha hai...\n` + C.reset);
            process.exit(0);

        } else {
            console.log(C.red + `\n[!] Ghalat button dabaya! Sirf 0 se 5 tak number likhein.\n` + C.reset);
            showMenu(sock);
        }
    });
}

let isMenuOpen = false;

async function startBot(askNumIfUnregistered = false) {
    showBanner();
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    // Agar pehli dafa chal raha hai to number poochega
    if (!state.creds.registered && !askNumIfUnregistered) {
        await new Promise((resolve) => {
            rl.question(C.yellow + `📱 Apna WhatsApp Number likhein (e.g. 923001234567) ya Default ke liye Enter dabayein: ` + C.reset, (inputNum) => {
                let clean = inputNum.replace(/[^0-9]/g, '');
                if (clean.startsWith('03')) clean = '92' + clean.substring(1);
                if (clean.length >= 10) PHONE_NUMBER = clean;
                resolve();
            });
        });
    }

    console.log(C.yellow + `\n[•] WhatsApp ke sath connect kiya ja raha hai...` + C.reset);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    if (!sock.authState.creds.registered) {
        await delay(3000);
        try {
            const code = await sock.requestPairingCode(PHONE_NUMBER);
            console.log(C.green + `\n================================================`);
            console.log(`📲 NUMBER: ${C.yellow}${PHONE_NUMBER}`);
            console.log(`${C.green}🔑 AAPKA WHATSAPP PAIRING CODE: ${C.bright}${C.cyan}${code}${C.reset}`);
            console.log(C.green + `================================================\n` + C.reset);
            console.log(C.yellow + `WhatsApp > Linked Devices > Link with phone number par ja kar yeh code lagayein.\n` + C.reset);
        } catch (err) {
            console.log(C.red + `\n[!] Pairing code lene mein masla aaya. Number check karein.` + C.reset);
        }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                isMenuOpen = false;
                startBot(true);
            } else {
                console.log(C.red + `\n[!] WhatsApp se Logout ho gaya hai. Dobara connect karne ke liye 'node bot.js' chalayein.` + C.reset);
                if (fs.existsSync('./auth_info')) {
                    fs.rmSync('./auth_info', { recursive: true, force: true });
                }
                process.exit(0);
            }
        } else if (connection === 'open' && !isMenuOpen) {
            isMenuOpen = true;
            showBanner();
            console.log(C.green + C.bright + `  [✔] Status: WhatsApp Connected Successfully!\n` + C.reset);
            showMenu(sock);
        }
    });
}

startBot();
