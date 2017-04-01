var archive = require('archive.is');
var telegram = require('telegram-bot-api');
var urlRegex = require('url-regex');

var api = new telegram({
	token: '291091522:AAE1mQYokX4-x6uH7qWGVPL_6dihU6GlJDU',
	updates: {enabled: true}
});

api.on('message', function(message) {
	console.log(message);
	console.log("======================");
	console.log(message.text);
	console.log(urlRegex().test(message.text));
	console.log("======================");
	var msg = message.text;
	
	if(urlRegex().test(msg)) {
		archive.save(msg).then(result => {
		send_msg( 
			message.chat.id,
			`${message.from.first_name} ${message.from.last_name} 님이 요청하신 주소에 대한 처리가 완료되었습니다.\n ====>\n ${result.shortUrl} `
		);
	});
	}
	else {
		send_msg(message.chat.id, `${msg}\n 는 올바른 주소가 아닙니다.`);
	}


/*
	var msg = message.text;
	var msgArr = msg.split('!save');
	if(msgArr[1] == '') {
		
	}
	else {
		archive.save(msgArr[1]).then(function(result) {
			send_msg(
				message.chat.id,
				`${message.from.first_name} ${message.from.last_name} 님이 요청하신 주소에 대한 처리가 완료되었습니다.\n ====>\n ${result.shortUrl} `
			);
		});
	}
*/
});


function send_msg(chat_id, msg) {
	api.sendMessage({
		chat_id: chat_id,
		text: msg
	}).then(function(msg) {
		console.log(msg);
	});
}
