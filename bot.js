import TelegramBot from "node-telegram-bot-api";

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

function sendMessagesInOrder(chatId, glyphs) {
	return glyphs.reduce((promiseChain, glyph) => {
		return promiseChain.then(() => {
			return bot.sendPhoto(
				chatId,
				`https://s3rbug.github.io/whousedglyph/heroes/hero_${
					glyph?.HeroID ?? 0
				}.png`,
				{
					caption: generateGlyphMessage(glyph),
					parse_mode: "Markdown",
					reply_markup: JSON.stringify({
						inline_keyboard: generateInlineKeyboardLinks(glyph),
					}),
				}
			);
		});
	}, Promise.resolve());
}

function generateInlineKeyboardLinks(glyph) {
	const dotaId = getDotaId(glyph?.UserSteamID ?? "");
	return [
		[
			{
				text: "Steam",
				url: `https://steamcommunity.com/profiles/${glyph?.UserSteamID})`,
			},
			{
				text: "Dotabuff",
				url: `https://www.dotabuff.com/players/${dotaId}`,
			},
		],
		[
			{
				text: "Stratz",
				url: `https://stratz.com/players/${dotaId}`,
			},
			{
				text: "Opendota",
				url: `https://www.opendota.com/players/${dotaId}`,
			},
		],
	];
}

function formatTime(minute, second) {
	return `${minute.toString().padStart(2, "0")}:${second
		.toString()
		.padStart(2, "0")}`;
}

function getPlayerSide(team) {
	return team === 2 ? "Radiant" : "Dire";
}

function generateGlyphMessage(glyph) {
	const messages = [
		`**Time:** ${formatTime(glyph?.Minute, glyph?.Second)}`,
		`**Username:** ${glyph?.Username}`,
		`**Team:** ${getPlayerSide(glyph?.Team)}`,
		`**Match id:** ${glyph?.MatchID}`,
	];
	return messages.join("\n");
}

const getDotaId = (userId) => {
	return (BigInt(userId) - BigInt("76561197960265728")).toString();
};

bot.onText(/\/match (.+)/, async function parseMatch(msg, match) {
	const matchId = match?.[1];
	if (!matchId) {
		bot.sendMessage(msg.chat.id, "No match id was provided");
		return;
	}
	const glyphs = await fetch(
		`https://go-glyph-v2-f53b68856ba5.herokuapp.com/api/glyph/${matchId}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		}
	).then((response) => {
		if (!response.ok) {
			bot.sendMessage(
				msg.chat.id,
				`Error while trying to fetch match ${matchId}`
			);
			return;
		}
		return response.json();
	});
	glyphs.sort((glyph1, glyph2) => {
		return (
			glyph1.Minute * 60 +
			glyph1.Second -
			(glyph2.Minute * 60 + glyph2.Second)
		);
	});
	sendMessagesInOrder(msg.chat.id, glyphs);
});
