
	var cacheElements = function () {
		
		scoring = matchView.querySelector('.scoring')
		judgeScores = scoring.querySelectorAll('.sc-judge');

		scoreboardWrap = document.getElementById('scoreboard-wrap');
		scoreboardTemplate = Handlebars.compile(document.getElementById('scoreboard-template').innerHTML);

		judges = [];
		judgesById = {};
		judgesList = document.getElementById('judge-list');
		[].forEach.call(judgesList.getElementsByClassName('judge'), function (item, index) {
			judges[index] = {
				id: null,
				name: null,
				slot: index,
				rootLi: item,
				nameH3s: [item.querySelector('.judge-name'), judgeScores[index].querySelector('.sc-judge-name')],
				stateSpan: item.querySelector('.judge-state'),
				btnsUl: item.querySelector('.judge-btns'),
				acceptBtn: item.querySelector('.judge-accept'),
				rejectBtn: item.querySelector('.judge-reject'),
				scoreHong: judgeScores[index].querySelector('.sc-hong'),
				scoreChong: judgeScores[index].querySelector('.sc-chong')
			};
		});
	};