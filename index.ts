import { createInterface } from "readline";
import axios from "axios";
import chalk from "chalk";
import fs from "fs";

const saveValidUsername = (username: string) => {
    fs.appendFileSync("./output/valid.csv", `${username}\n`);
}

const saveInvalidUsername = (username: string) => {
    fs.appendFileSync("./output/invalid.csv", `${username}\n`);
}

const randomizeBirthDate = () => {
    const d = Math.floor(Math.random() * 9) + 1;
    const m = Math.floor(Math.random() * 9) + 1;
    const y = 2000 + Math.floor(Math.random() * 6);
    return `${y.toString().padStart(2, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}T17:00:00.000Z`;
}

const randomizeUsername = (letterLength: number) => {
  const letters = "abcdefghijklmnopqrstuvwxyz1234567890";
  return Array.from({ length: letterLength }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
};

const usernameValidator = async (username: string, date: string, csrfToken: string): Promise<UsernameValidatorResponse | false> => {
    try {
        const response = await axios.post<UsernameValidatorResponse>(`https://auth.roblox.com/v1/usernames/validate`, {
            username,
            birthday: date,
            context: "Signup"
        }, {
            headers: {
                'accept': 'application/json, text/plain, */*',
                'accept-language': 'en-US,en;q=0.9',
                'content-type': 'application/json;charset=UTF-8',
                'origin': 'https://www.roblox.com',
                'referer': 'https://www.roblox.com/',
                'sec-ch-ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-site',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
                'x-csrf-token': csrfToken
            }
        });
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.log(chalk.yellow(`Error for username ${username}: ${error.response?.status} - ${error.response?.data?.message || error.message}`));
        } else {
            console.log(chalk.yellow(`Unknown error for username ${username}: ${error}`));
        }
        return false;
    }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isUsernameProcessed = (username: string): boolean => {
    try {
        const validUsernames = fs.readFileSync("./output/valid.csv", "utf-8").split("\n");
        const invalidUsernames = fs.readFileSync("./output/invalid.csv", "utf-8").split("\n");
        return validUsernames.includes(username) || invalidUsernames.includes(username);
    } catch (error) {
        return false;
    }
}

const getUserInput = async (prompt: string): Promise<string> => {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(chalk.cyan(prompt), (answer) => {
            rl.close();
            resolve(answer);
        });
    });
};

(async () => {
    const letterLength = await getUserInput("Enter the length of the username: ");
    console.log(chalk.blue("Starting bruteforce username validator..."));
    while (true) {
        try {
            const username = randomizeUsername(parseInt(letterLength));
            if (isUsernameProcessed(username)) {
                console.log(chalk.yellow(`${username} was already processed, skipping...`));
                continue;
            }

            const birth = randomizeBirthDate();
            const result = await usernameValidator(username, birth, "FP9BjB+0R3CX");
            if(!result) {
                await delay(1000);
                continue;
            }

            if (result.code === 0) {
                saveValidUsername(username);
                console.log(chalk.green(`${username} is valid`));
            } else {
                saveInvalidUsername(username)
                console.log(chalk.red(`${username} is invalid: ${result.message}`));
            }
            
            await delay(500);
        } catch (error) {
            console.log(chalk.yellow('Error occurred, retrying...'));
            await delay(2000);
        }
    }
})();
