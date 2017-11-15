require('dotenv-extended').load();
const { setInterval } = require('timers');
const builder = require('botbuilder');
const restify = require('restify');
const { Prompts, UniversalBot, ChatConnector, Message } = builder;
const Mongo = require('./MongoInterface');

let db = new Mongo();

const server = restify.createServer();
server.listen(process.env.PORT, () => {
	console.log(`${server.name} listening to ${server.url}`);
});

let connector = new ChatConnector({
	appId: process.env.MICROSOFT_APP_ID,
	appPassword: process.env.MICROSOFT_APP_PASSWORD
});
server.post('/api/messages', connector.listen());

let timer;
let counter = 0;

let bot = new UniversalBot(connector, (session) => {
	session.send(session.conversationData.isActive + " begg");
	session.conversationData.count = 0;
	if (!session.conversationData.isActive)
		session.replaceDialog('root');
});

bot.dialog('root', [
	(session) => {
		session.send('inside root dialog');
		session.send('before if ' + counter);
		if (session.message.address.conversation.id == process.env.TARGET_CHANNEL_ID) {
			session.send('inside if');
			session.beginDialog('proActive');
		}
		else {
			session.send('inside else');
			// session.userData.isActive = false;
			session.endConversation();
		}
	}
]);

bot.dialog('proActive', (session) => {
	// session.userData.isActive = true;
	if (counter > 0)
		session.endConversation();
	session.send('starting...');
	counter++;
	session.send(counter + " count");
	timer = setInterval(() => {
		db.find('pendingMessages', {}, (results) => {
			results.forEach((item) => {
				let msg = item.message;
				session.send(msg);
			});
			db.deleteManyDocuments('pendingMessages', {});
		});
	}, 10000);
});

bot.dialog('ender', (session) => {
	// session.userData.isActive = false;
	session.endConversation('The End');
	counter = 0;
	clearInterval(timer);
})
	.triggerAction({
		matches: /^end$/i
	});
