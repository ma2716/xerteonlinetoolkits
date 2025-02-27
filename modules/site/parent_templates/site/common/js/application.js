/**
 * Licensed to The Apereo Foundation under one or more contributor license
 * agreements. See the NOTICE file distributed with this work for
 * additional information regarding copyright ownership.

 * The Apereo Foundation licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at:
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

$(document).ready(init);

var XBOOTSTRAP = {};
var data;
var languageData;
var startPage = 0;
var startSection;
var startContent;
var theme = "default";
var authorSupport = false;
var deepLink = "";
var sectionJump;
var currentPage;
var pageHistory = [];
var glossary = [];
var defaultHeaderCss;
var urlParams = {};
var categories;
var validPages = [];

function init(){
	loadContent();
};

// called after all content loaded to set up mediaelement.js players
function initMedia($media){

	$media.mediaelementplayer({
		pauseOtherPlayers: true,
		enableAutosize: true,
		classPrefix: 'mejs-', // use the class naming format used in old version just in case some themes or projects use the old classes

		success: function (mediaElement, domObject) {

			var $mediaElement = $(mediaElement);

			// iframe scaling to maintain aspect ratio
			if ($mediaElement.find('video').length > 0 && $mediaElement.find('video').attr('type') != 'video/mp4') {
				iframeInit($mediaElement);

				// the vimeo video won't play with the media element controls so remove these so default vimeo controls can be used
				if ($mediaElement.find('video').attr('type') == 'video/vimeo') {
					$mediaElement.parents('.mejs-container').find('.mejs-iframe-overlay, .mejs-layers, .mejs-controls').remove();
				}
			}

			// stops mp4 videos being shown larger than original
			mediaElement.addEventListener("loadedmetadata", function(e) {
				var $video = $(e.detail.target);
				$video.add($video.parents('.mejs-container')).css({
					'max-width': e.detail.target.videoWidth,
					'max-height': e.detail.target.videoHeight
				});
			});
		},
		error: function(mediaElement) {
			console.log('mediaelement problem is detected: ', mediaElement);
		}
	});
}

// function manually sets height of any media shown in iframes (e.g. youtube/vimeo) to maintain aspect ratios
function iframeInit($mediaElement) {
	if ($mediaElement.find('iframe').length > 0) {
		iframeResize($mediaElement.find('iframe'));
	} else {
		// try again if iframe's not ready yet
		setTimeout(function() {
			iframeInit($mediaElement);
		}, 200);
	}
}

// resize iframe height to keep aspect ratio
function iframeResize($iframe) {
	if ($iframe.parents('.navigator.carousel').length > 0) {
		$iframe.height(($iframe.parents('.navigator.carousel').width() / Number($iframe.parents('.vidHolder').data('iframeRatio')[0])) * Number($iframe.parents('.vidHolder').data('iframeRatio')[1]));
		$iframe.parents('.mejs-container').height('auto');
	} else {
		$iframe.height(($iframe.width() / Number($iframe.parents('.vidHolder').data('iframeRatio')[0])) * Number($iframe.parents('.vidHolder').data('iframeRatio')[1]));
		$iframe.parents('.mejs-container').height('auto');
	}
}

function initSidebar(){
	var $window = $(window)

	//TOC
	$('.bs-docs-sidenav').affix
	(
		{
			offset:
			{
				top: function () { return $window.width() <= 980 ? 290 : 210 },
				bottom: 270
			}
		}
	)
}

function loadContent(){

	$.ajax({

		type: "GET",
		url: projectXML,
		dataType: "text",
		success: function(text) {
			var newString = makeAbsolute(text);
			data = $.parseXML(newString);

			//step one - css
			cssSetUp('theme');

		}
	});

	// sort any parameters in url - these will override those in xml
    var tempUrlParams = window.location.search.substr(1, window.location.search.length).split("&");
    for (i = 0; i < tempUrlParams.length; i++) {
        urlParams[tempUrlParams[i].split("=")[0]] = tempUrlParams[i].split("=")[1];
    }

	// does URL specify which page & section to start on?
	var pageSectionInfo;

	if (urlParams.linkID != undefined) { // URL?linkID=XXX
		pageSectionInfo = getHashInfo(urlParams.linkID);
		if (pageSectionInfo != false) {
			startPage = pageSectionInfo[0];
		}
	}

	pageSectionInfo = getHashInfo(window.location.hash); // URL#pageXXXsectionXXXcontentXXX
	if (pageSectionInfo != false) {
		startPage = pageSectionInfo[0];
		startSection = pageSectionInfo[1];
		startContent = pageSectionInfo[2];
	}

	// some iframes will need height manually set to keep aspect ratio correct so keep track of window resize
	$(window).resize(function() {

		$.featherlight.close();

		if (this.resizeTo) {
			clearTimeout(this.resizeTo);
		}
		this.resizeTo = setTimeout(function() {
			$(this).trigger("resizeEnd");
		}, 200);
	});

	$(window).on("resizeEnd", function() {
		$('.vidHolder iframe').each(function() {
			iframeResize($(this))
		});
	});
}

// Make absolute urls from urls with FileLocation + ' in their strings
function makeAbsolute(html) {
    var temp = html.replace(/FileLocation \+ \'([^\']*)\'/g, FileLocation + '$1');
    return temp;
}

function cssSetUp(param) {
	param = (typeof param !== 'undefined') ?  param : "theme";

	switch(param) {
        case 'theme':
            if ($(data).find('learningObject').attr('theme') != undefined)
            {
                theme = $(data).find('learningObject').attr('theme');
            }

            // See if we have a theme definition in the url
            if (urlParams.theme != undefined && ($(data).find('learningObject').attr('themeurl') == undefined || $(data).find('learningObject').attr('themeurl') != 'true'))
            {
                theme = urlParams.theme;
            }

			if ( theme != undefined && theme != "default") {
				$('head').append('<script src="'+ themePath + theme + '/'+ theme+ '.js"' + '</script>');
				insertCSS(themePath + theme + '/' + theme + '.css', function() {cssSetUp('stylesheet')});
			} else {
				cssSetUp('stylesheet');
			}
            break;
        case 'stylesheet':
			if ( $(data).find('learningObject').attr('stylesheet') != undefined && $(data).find('learningObject').attr('stylesheet').trim() != '' ) {
				insertCSS($(data).find('learningObject').attr('stylesheet'), function() { loadLibraries(); });
			} else {
				loadLibraries();
			}
            break;
	}

}

function insertCSS(href, func) {

	var css = document.createElement("link");
	var element = null;
	var donotreplace = false;
	css.rel = "stylesheet";
	css.type = "text/css";
	css.href = href;

	// don't continue until css has loaded as otherwise css priorities can be messed up
	if (func != undefined) {

		css.onload = function(){
			func();
		};

		css.onerror = function(){
			func();
		};

	}

	document.getElementsByTagName("head")[0].appendChild(css);
}

function loadLibraries() {

	if ( $(data).find('learningObject').attr('styles') != undefined){

		$('head').append('<style type="text/css">' +  $(data).find('learningObject').attr('styles') + '</style>');

	}

	var lang = $(data).find('learningObject').attr('language');

	if ( $(data).find('learningObject').attr('libs') != undefined){

		var libs = $(data).find('learningObject').attr('libs').split('||');

		var libCount = libs.length;
		var loaded = 0;

		for (var i = 0; i< libCount; i++){

			$.getScript(libs[i], function(data, success, jqxhr){

				loaded++;

				if (loaded == libs.length){

					//step two
					getLangData(lang)

				}

			});

		}

	} else {

		getLangData(lang)

	}

}

function getLangData(lang) {

	if (lang == undefined || lang == "undefined" || lang == "") {
		lang = "en-GB";
	}

	$.ajax({
		type: "GET",
		url: "languages/engine_" + lang + ".xml",
		dataType: "xml",

		success: function (xml) {

			languageData = $(xml).find("language");

			//step three
			setup();

			// step four
			parseContent({ type: "start", id: startPage }, startSection, startContent);

		},

		error: function () {

			if (lang != "en-GB") { // no language file found - try default GB one
				getLangData("en-GB");
			} else { // hasn't found GB language file - set up anyway, will use fallback text in code
				languageData = $("");
				setup();
				parseContent({ type: "start", id: startPage }, startSection, startContent);
			}

		}
	});
}

function formatColour(col) {
	return (col.length > 3 && col.substr(0,2) == '0x') ? '#' + col.substr(2) : col;
}

function setup() {

	if (window.location.pathname.substring(window.location.pathname.lastIndexOf("/") + 1, window.location.pathname.length).indexOf("preview") != -1 && $(data).find('learningObject').attr('authorSupport') == 'true' ) {
		authorSupport = true;
	}

	if ($(data).find('learningObject').attr('variables') != undefined) {
		// calculate author set variables
		XBOOTSTRAP.VARIABLES.init($(data).find('learningObject').attr('variables'));

		// check xml text for variables - if found replace with variable value
		if (XBOOTSTRAP.VARIABLES && XBOOTSTRAP.VARIABLES.exist()) {
			x_checkForText($(data).find('page'), 'variables');
		}
	}

	if ($(data).find('learningObject').attr('globalVars') == 'true') {
		// check xml text for global variables - if found replace with variable value
		x_checkForText($(data).find('page'), 'globalVars');
	}

	if ($(data).find('learningObject').attr('glossary') != undefined) {

		// get list of glossary words & definitions
		var i, len, item, word,
			items = $(data).find('learningObject').attr('glossary').split("||");

		for (i=0, len=items.length; i<len; i++) {
			item = items[i].split("|"),
			word = {word:item[0], definition:item[1]};

			if (word.word.replace(/^\s+|\s+$/g, "") != "" && word.definition.replace(/^\s+|\s+$/g, "") != "") {
				glossary.push(word);
			}
		}

		if (glossary.length > 0) {
			glossary.sort(function(a, b){ // sort by size
				return a.word.length > b.word.length ? -1 : 1;
			});

			// show definition on hover
			if ($(data).find('learningObject').attr('glossaryHover') == undefined || $(data).find('learningObject').attr('glossaryHover') == "true") {

				x_checkForText($(data).find('page'), 'glossary');

				// add events to control what happens when you rollover glossary words
				$("body > .container")
					.on("mouseenter", ".glossary", function(e) {
						$(this).trigger("mouseleave");

						var $this = $(this),
							myText = $this.text(),
							myDefinition, i, len;

						for (i=0, len=glossary.length; i<len; i++) {
							if (myText.toLowerCase() == glossary[i].word.toLowerCase()) {
								myDefinition = "<b>" + myText + ":</b><br/>"
								myDefinition += glossary[i].definition;
							}
						}

						$(this).parents('.container').append('<div id="glossaryHover" class="glossaryTip">' + myDefinition + '</div>');

						$("#glossaryHover").css({
							"left"	:$(this).offset().left + 20,
							"top"	:$(this).offset().top + 20
						});
						$("#glossaryHover").fadeIn("slow");
					})
					.on("mouseleave", ".glossary", function(e) {
						$(this).parent('.container').off("click.glossary");

						if ($("#glossaryHover") != undefined) {
							$("#glossaryHover").remove();
						}
					})
					.on("mousemove", ".glossary", function(e) {
						$("#glossaryHover").css({
							"left": e.pageX + 20,
							"top": e.pageY + 20
						});
					})
					.on("focus", ".glossary", function(e) { // called when link is tabbed to
						$(this).trigger("mouseenter");
					})
					.on("focusout", ".glossary", function(e) {
						$(this).trigger("mouseleave");
					});
			}

			// show glossary in its own page
			if ($(data).find('learningObject').attr('glossaryPage') != undefined && $(data).find('learningObject').attr('glossaryPage') != 'none') {

				glossary.sort(function(a, b){ // sort alphabetically
					if(a.word < b.word) return -1;
					if(a.word > b.word) return 1;
					return 0;
				})

				var charList = [],
					glossaryTxt = [];

				for (var i=0; i<glossary.length; i++) {
					if (charList.length == 0 || charList[charList.length - 1] != glossary[i].word[0]) {
						charList += glossary[i].word[0];
						glossaryTxt.push('<h3>' + glossary[i].word + '</h3><div>' + glossary[i].definition + '</div>');
					} else {
						glossaryTxt.splice(glossaryTxt.length - 1, 1, glossaryTxt[glossaryTxt.length - 1] + '<h3>' + glossary[i].word + '</h3><div>' + glossary[i].definition + '</div>');
					}
				}

				var $glossaryPage = $('<page name="Glossary" subtitle=""></page>');
				for (var i=0; i<charList.length; i++) {
					var cDataSection = data.createCDATASection(glossaryTxt[i]);
					var $section = $('<section name="' + charList[i] + '"><text></text></section>');
					$section.find('text').append(cDataSection);

					if ($(data).find('learningObject').attr('glossaryMenu') != undefined && $(data).find('learningObject').attr('glossaryMenu') != '') {
						$section.attr('menu', $(data).find('learningObject').attr('glossaryMenu'));
					}
					$glossaryPage.append($section);
				}

				if ($(data).find('learningObject').attr('glossaryPage') == "first") {
					$glossaryPage.prependTo($(data).find('learningObject'));
				} else {
					$glossaryPage.appendTo($(data).find('learningObject'));
				}
			}
		}
	}

	// if project is being viewed as https then force any iframe src to be https too
	if (window.location.protocol == "https:") {
		x_checkForText($(data).find('page'), 'iframe');
	}

	// add all the pages to the pages menu: this links back to the same page
	$(data).find('page').each( function(index, value){
		// work out whether the page is hidden or not - can be simply hidden or hidden between specific dates/times
		var hidePage = checkIfHidden($(this).attr('hidePage'), $(this).attr('hideOnDate'), $(this).attr('hideOnTime'), $(this).attr('hideUntilDate'), $(this).attr('hideUntilTime'), 'Page');
		if ($.isArray(hidePage)) {
			$(this).attr('hidePageInfo', hidePage[1]);
			hidePage = hidePage[0];
		}
		$(this).attr('hidePage', hidePage);

		if ((hidePage == false || authorSupport == true) && $(this).attr('linkPage') != 'true') {
			var name = $(this).attr('name');

			// remove size & background color styles from links on nav bar
			if ($('<p>' + name + '</p>').children().length > 0) {
				name = $(name);
				name.css({ 'font-size': '', 'background-color': 'transparent' });
				name.find('[style*="font-size"]').css('font-size', '');
				name.find('[style*="background-color"]').css('background-color', 'transparent');
			}

			var $link = $('<li class=""><a href="javascript:parseContent({ type: \'index\', id: ' + index + ' })"></a></li>').appendTo('#nav');
			$link.find('a').append(name);

		}
	});

	// if pages have customLinkID then make sure they don't include spaces - convert to underscore
	$(data).find('page').each( function(index, value){
		var tempID = $(this).attr('customLinkID');
		if (tempID != undefined && tempID != "") {
			tempID = $.trim(tempID);
			tempID = tempID.split(" ").join("_");
			$(this).attr('customLinkID', tempID);
		}
	});

	// make list of all the normal pages (not hidden or standalone) to display in TOC
	if (validPages.length == 0) {
		for (var i=0; i<$(data).find('page').length; i++) {
			if (($(data).find('page').eq(i).attr('hidePage') != 'true' || authorSupport == true) && $(data).find('page').eq(i).attr('linkPage') != 'true') {
				validPages.push(i);
			}
		}
	}

	// add a back button that will be hidden unless used by standalone pages
	var $backBtn = $('<li class="backBtn"><a><i class="fa fa-arrow-left text-white ml-3" aria-hidden="true"></i>' + (languageData.find("backButton")[0] != undefined && languageData.find("backButton")[0].getAttribute('label') != null ? languageData.find("backButton")[0].getAttribute('label') : "Back") + '</a></li>');

	$backBtn
		.prependTo('#nav')
		.hide()
		.click(function() {
			if (pageHistory.length <= 1) {
				// if standalone page is the first page visited then back button will take to 1st normal page...
				parseContent({ type: "index", id: validPages[0] });

			} else {
				// ...otherwise go to the last viewed page
				pageHistory.splice(pageHistory.length - 1, 1);
				parseContent({ type: "check", id: pageHistory[pageHistory.length-1] });
			}
		});

	// set up print functionality - all this does is add a print button to the toolbar which triggers browser's print dialog
	if ($(data).find('learningObject').attr('print') == 'true') {

		var altTxt = languageData.find("print")[0] != undefined && languageData.find("print")[0].getAttribute('printBtn') != null ? languageData.find("print")[0].getAttribute('printBtn') : "Print page";

		$('<li id="printIcon"><a href="#" aria-label="' + altTxt + '"><i class="fa fa-print text-white ml-3" aria-hidden="true" title="' + altTxt + '"></i></a></li>')
			.appendTo('#nav')
			.click(function() {
				window.print();
			});
	}

	// set up search functionality
	if ($(data).find('learningObject').attr('search') == 'true' || $(data).find('learningObject').attr('category') == 'true') {

		var $searchHolder = $('<div id="searchHolder"></div>'),
			$searchInner = $('<div id="searchInner"></div>');

		// text search - not working yet
		/*if ($(data).find('learningObject').attr('search') == 'true') {
			var freeSearchType = $(data).find('learningObject').attr('searchType') != undefined ? $(data).find('learningObject').attr('searchType') : 'meta';

			$('<div id="textSearch"><input class="form-control" type="text" placeholder="Search" aria-label="Search"></div>')
				.appendTo($searchInner);
		}*/

		// category search
		if ($(data).find('learningObject').attr('category') == 'true' && $(data).find('learningObject').attr('categoryInfo') != '') {
			categories = $(data).find('learningObject').attr('categoryInfo').split('||');
			for (var i=0; i<categories.length; i++) {
				var categoryInfo = categories[i].split('|');

				if (categoryInfo.length == 2) {
					var title = categoryInfo[0].trim(),
						opts = categoryInfo[1].split('\n');

					for (var j=0; j<opts.length; j++) {
						opts.splice(j, 1, opts[j].trim());

						if (opts[j].length == 0) {
							opts.splice(j, 1);
							j--;
						} else {
							var stripTags = $("<div/>").html(opts[j]).text().trim();
							if (stripTags.length > 0) {
								var optInfo = stripTags.split('(');
								if (optInfo.length > 1 && optInfo[1].trim().length > 0) {
									opts.splice(j, 1, { id: optInfo[0].trim(), name: optInfo[1].trim().slice(0, -1) });
								} else {
									opts.splice(j, 1, { id: optInfo[0].replace(/ /g, "_"), name: optInfo[0] });
								}
							} else {
								opts.splice(j, 1);
								j--;
							}
						}
					}

					if (title.length > 0 && opts.length > 0) {
						categories.splice(i, 1, { name: title, options: opts});
					} else {
						categories.splice(i, 1);
						i--;
					}
				} else {
					categories.splice(i, 1);
					i--;
				}
			}

			// some categories exist - create menu
			if (categories.length > 0) {
				var $categorySearch = $('<div id="categorySearch"></div>');

				for (var i=0; i<categories.length; i++) {
					var $optGroup = $('<div id="cat' + i + '" class="catBlock"><div class="catContents"><h2 class="catName">' + categories[i].name + ':</h2></div></div>').appendTo($categorySearch);

					for (var j=0; j<categories[i].options.length; j++) {
						$optGroup.find('.catContents').append('<div class="inputGroup"><input type="checkbox" name="' + categories[i].name + '" id="cat' + i + '_' + j + '" value="cat' + i + '_' + j + '"><label for="cat' + i + '_' + j + '">' + categories[i].options[j].name + '</label></div>');
					}
				}

				$categorySearch.appendTo($searchInner);

				// work out what categories each page / section falls under
				$(data).find('page').each(function(index, value) {

					var $page = $(this);

					if ($page.attr('hidePage') != 'true') {
						if ($page.attr('filter') != undefined && $page.attr('filter') != '') {
							var catIds = [],
								categoryInfo = $page.attr('filter').split(',');

							for (var i=0; i<categoryInfo.length; i++) {
								var category = categoryInfo[i].trim(),
									found = false;

								for (var j=0; j<categories.length; j++) {
									for (var k=0; k<categories[j].options.length; k++) {
										if (category.toLowerCase() == categories[j].options[k].id.toLowerCase()) {
											catIds.push('cat' + j + '_' + k);
											found = true;
											break;
										}
									}

									if (found == true) {
										break;
									}
								}
							}

							$page.attr('filter', catIds);
						}

						$page.children().each(function(index, value) {
							var $section = $(this);

							if ($section.attr('filter') != undefined && $section.attr('filter') != '') {
								var catIds = [],
									categoryInfo = $section.attr('filter').split(',');

								for (var i=0; i<categoryInfo.length; i++) {
									var category = categoryInfo[i].trim(),
										found = false;

									for (var j=0; j<categories.length; j++) {
										for (var k=0; k<categories[j].options.length; k++) {
											if (category.toLowerCase() == categories[j].options[k].id.toLowerCase()) {
												catIds.push('cat' + j + '_' + k);
												found = true;
												break;
											}
										}

										if (found == true) {
											break;
										}
									}
								}

								$section.attr('filter', catIds);
							}
						});
					}
				});
			}
		}

		if ($searchInner.children().length > 0) {
			$searchInner
				.prepend('<h1 class="searchTitle"></h1><div class="searchIntro"></div>')
				.find('.searchTitle').html((languageData.find("search")[0] != undefined && languageData.find("search")[0].getAttribute('title') != null ? languageData.find("search")[0].getAttribute('title') : "Search") + ':');

			if ($(data).find('learningObject').attr('categoryTxt') != '' && $(data).find('learningObject').attr('categoryTxt') != undefined) {
				$searchInner.find('.searchIntro').html($(data).find('learningObject').attr('categoryTxt'));
			} else {
				$searchInner.find('.searchIntro').remove();
			}

			$searchHolder
				.append($searchInner)
				.append('<div id="searchResults" class=""></div></li></ul>')
				.find('#searchInner').append('<button id="searchBtn" type="button" class="searchBtn btn btn-primary">' + (languageData.find("search")[0] != undefined && languageData.find("search")[0].getAttribute('goBtn') != null ? languageData.find("search")[0].getAttribute('goBtn') : "Go") + '</button>');

			$('<li id="searchIcon"><a href="#"><i class="fa fa-search text-white ml-3" aria-hidden="true"></i>' + (languageData.find("search")[0] != undefined && languageData.find("search")[0].getAttribute('searchBtn') != null ? languageData.find("search")[0].getAttribute('searchBtn') : "Search") + '</a></li>')
				.appendTo('#nav')
				.click(function() {
					$searchHolder
						.css({
							width: $('.container').width() * 0.80,
							height: $(window).height() * 0.80
						});

					$.featherlight($searchHolder, {
						persist: true,
						afterClose: function(e) {
							// if closed because of link to a page section then this stops it jumping back to top of page afterwards
							if (e == true) {
								this._previouslyActive = sectionJump;
							}

							// clear checkboxes if search wasn't carried out or returned no results
							if ($searchHolder.find('#noSearchResults').length > 0 || $searchHolder.find('#searchResults .result').length == 0) {

								$searchHolder.find('#categorySearch input').prop("checked", false);

								$searchHolder.find('#searchResults')
									.empty()
									.hide();
							}
						}
					});
				});

			$searchHolder.find('#searchBtn')
				.button()
				.click(function() {

					var $searchLightbox = $('#searchHolder'),
						results = [], // the pages / sections which match search terms
						catsUsed = [],
						numResults = 0;

					// text search
					/*if ($searchLightbox.find('#textSearch input').length > 0 && $searchLightbox.find('#textSearch input').val().trim() != '') {
						//$searchLightbox.find('#textSearch input').val());
					}*/

					if ($searchLightbox.find('#categorySearch').length > 0) {

						$searchLightbox.find('#categorySearch input:checked').each(function() {
							var lookingFor = $(this).attr('value'),
								thisCat = lookingFor.substring(3).split('_');

							if ($.inArray(lookingFor.substring(3).split('_')[0], catsUsed) == -1) {
								catsUsed.push(lookingFor.substring(3).split('_')[0]);
							}

							$(data).find('page').each(function(index, value) {
								var $page = $(this),
									pageIndex = index;

								if (results.length < $(data).find('page').length) {
									results.push( { match: [], sections: [] } );
								}

								if ($page.attr('hidePage') != 'true') {
									if ($page.attr('filter') != undefined && $page.attr('filter').split(',').length > 0) {
										var indexInArray = $.inArray(lookingFor, $page.attr('filter').split(','));

										if (indexInArray > -1) {
											results[pageIndex].match.push(lookingFor);
											numResults++;
										}
									}

									$page.children().each(function(index, value) {
										var $section = $(this);

										if (results[pageIndex].sections.length < $page.children().length) {
											results[pageIndex].sections.push( { match: [] } );
										}

										if ($section.attr('hidePage') != 'true' && $section.attr('filter') != undefined && $section.attr('filter').split(',').length > 0) {
											var indexInArray = $.inArray(lookingFor, $section.attr('filter').split(','));

											if (indexInArray > -1) {
												results[pageIndex].sections[index].match.push(lookingFor);
												numResults++;
											}
										}
									});
								}
							});
						});
					}

					var $searchResults = $('#searchResults').empty();

					if (numResults != 0) {

						$searchResults
							.append('<h1 class="searchTitle">' + (languageData.find("search")[0] != undefined && languageData.find("search")[0].getAttribute('resultTitle') != null ? languageData.find("search")[0].getAttribute('resultTitle') : "Results") + ':</h1>')
							.append('<button id="newSearchBtn" type="button" class="searchBtn btn btn-primary">' + (languageData.find("search")[0] != undefined && languageData.find("search")[0].getAttribute('newBtn') != null ? languageData.find("search")[0].getAttribute('newBtn') : "New Search") + '</button>');

						// create the list of results - ordered into list according to those matching the most filter categories
						function createResultDivs(pageOrSection, index) {
							var title = $(data).find('page').eq(index[0]).attr('name') + (index.length > 1 ? ': ' + $(data).find('page').eq(index[0]).children().eq(index[1]).attr('name') : ''),
								faIcon = index.length == 1 ? 'fa-file' : 'fa-tag',
								catMatches = '',
								uniqueCats = [];

							for (var k=0; k<pageOrSection.match.length; k++) {
								var info = pageOrSection.match[k].substring(3).split('_');
								catMatches += categories[info[0]].options[info[1]].name + ', ';

								if ($.inArray(info[0], uniqueCats) == -1) {
									uniqueCats.push(info[0]);
								}
							}
							catMatches = catMatches.substring(0, catMatches.length - 2);

							var linkAction;
							if (index.length == 1) {
								linkAction = "x_navigateToPage(false, { type:'linkID', ID:'" + $(data).find('page').eq(index[0]).attr('linkID') + "' }); $.featherlight.close(true); return false;";
							} else {
								linkAction = "x_navigateToPage(false, { type:'linkID', ID:'" + $(data).find('page').eq(index[0]).children().eq(index[1]).attr('linkID') + "' }); $.featherlight.close(true); return false;";
							}

							var matchType = uniqueCats.length == catsUsed.length ? 'fullMatch' : 'partialMatch',
								$resultDiv = $('<div class="result ' + matchType + '"><a href="#" onclick="' + linkAction + '"><i class="fa ' + faIcon + ' text-white ml-3" aria-hidden="true"></i>' + title + '</a>' + '<div class="matchList"><i>' + (languageData.find("search")[0] != undefined && languageData.find("search")[0].getAttribute('matchTitle1') != null ? languageData.find("search")[0].getAttribute('matchTitle1') : "Matches") + ': ' + catMatches + '</i></div></div>');

							$resultDiv
								.data({
									'match': pageOrSection.match,
									'numCats': uniqueCats.length
								});

							if ($searchResults.find('.result').length > 0) {

								$searchResults.find('.result').each(function(k) {
									if (uniqueCats.length > $(this).data('numCats')) {
										$resultDiv.insertBefore($(this));
										return false;
									} else if ($searchResults.find('.result').length - 1 == k) {
										$searchResults.append($resultDiv);
									}
								});

							} else {
								$searchResults.append($resultDiv);
							}
						}

						for (var i=0; i<results.length; i++) {
							if (results[i].match.length > 0) {
								createResultDivs(results[i], [i]);
							}

							for (var j=0; j<results[i].sections.length; j++) {
								if (results[i].sections[j].match.length > 0) {
									createResultDivs(results[i].sections[j], [i,j]);
								}
							}
						}

						// add headings to show which are full/partial matches
						if ($searchResults.find('.fullMatch').length > 0) {
							$('<h2 id="fullMatch" class="searchResultInfo">' + (languageData.find("search")[0] != undefined && languageData.find("search")[0].getAttribute('matchTitle2') != null ? languageData.find("search")[0].getAttribute('matchTitle2') : "Best matches") + ':</h2>').insertBefore($searchResults.find('.fullMatch').eq(0));
						}

						if ($searchResults.find('.partialMatch').length > 0) {
							var $partialMatch = $('<h2 id="partialMatch" class="searchResultInfo"></h2>').insertBefore($searchResults.find('.partialMatch').eq(0));

							if ($searchResults.find('#fullMatch').length == 0) {
								$partialMatch.html((languageData.find("search")[0] != undefined && languageData.find("search")[0].getAttribute('noMatch2') != null ? languageData.find("search")[0].getAttribute('noMatch2') : 'No pages or sections completely match your criteria. Partial matches are listed below') + ':');

							} else {
								$searchResults.find('.partialMatch').hide();

								function showPartialResults() {
									$searchResults.find('.partialMatch').show();
								}

								$partialMatch
									.html('<a href="#">' + (languageData.find("search")[0] != undefined && languageData.find("search")[0].getAttribute('showMatch') != null ? languageData.find("search")[0].getAttribute('showMatch') : "Show partial matches") + '</a>')
									.find('a').click(function() {
										$searchResults.find('.partialMatch').show();
										$partialMatch.html((languageData.find("search")[0] != undefined && languageData.find("search")[0].getAttribute('matchTitle3') != null ? languageData.find("search")[0].getAttribute('matchTitle3') : "Partial matches") + ':');
									});
							}
						}

						$searchResults.find('#newSearchBtn').click(function() {
							$('#searchHolder').find('#searchInner').show();
							$('#searchResults').hide();
						});

						$searchLightbox.find('#searchInner').hide();
						$searchResults.show();

					} else {
						$searchResults
							.append('<p id="noSearchResults">' + (languageData.find("search")[0] != undefined && languageData.find("search")[0].getAttribute('noMatch1') != null ? languageData.find("search")[0].getAttribute('noMatch1') : "No pages or sections match your selection.") + '</p>')
							.show();
					}
				});
		}
	}

	// --------------- Optional Header properties --------------------

	if ($(data).find('learningObject').attr('headerHide') != undefined && $(data).find('learningObject').attr('headerHide') != 'false') {

		$(".jumbotron").remove();

	} else {

		// default logos used are logo_left.png & logo.png in modules/site/parent_templates/site/common/img/
		// they are overridden by any logos in theme folders
		// they can also be overridden by images uploaded via Header Logo optional properties
		$('#overview div.logoR, #overview div.logoL').hide();
		$('#overview div.logoR').data('defaultLogo', $('#overview .logoR img').attr('src'));
		$('#overview .logoR img').attr('alt', '');
		$('#overview div.logoL').data('defaultLogo', $('#overview .logoL img').attr('src'));
		$('#overview .logoL img').attr('alt', '');

		var checkExists = function(logoClass, type, fallback) {
			$.ajax({
				url: $('#overview .' + logoClass + ' img').attr('src'),
				success: function() {
					$('#overview').addClass(logoClass);
					$('#overview div.' + logoClass).show();

					// the theme logo is being used - add a class that will allow for the different size windows to display different logos
					if (type == 'theme') {
						$('#overview .' + logoClass + ' img.' + logoClass).addClass('themeLogo');
					}
				},
				error: function() {
					if ($(data).find('learningObject').attr(logoClass + 'Hide') == 'true') {
						$('#overview .' + logoClass + ' img').removeAttr('src');
					} else {
						if (fallback == 'theme') {
							$('#overview .' + logoClass + ' img').attr('src', themePath + $(data).find('learningObject').attr('theme') + '/logo' + (logoClass == 'logoL' ? '_left' : '') + '.png');
							checkExists(logoClass, 'theme', 'default');
						} else if (fallback == 'default') {
							$('#overview .' + logoClass + ' img').attr('src', $('#overview div.' + logoClass).data('defaultLogo'));
							checkExists(logoClass);
						}
					}
				}
			});
		}

		var type, fallback;
		if ($(data).find('learningObject').attr('logoR') != undefined && $(data).find('learningObject').attr('logoR') != '') {
			$('#overview .logoR img').attr('src', $(data).find('learningObject').attr('logoR'));
			$('#overview .logoR img').attr('alt', $(data).find('learningObject').attr('logoRAlt'));
			type = 'LO';
			fallback = $(data).find('learningObject').attr('theme') != undefined && $(data).find('learningObject').attr('theme') != "default" ? 'theme' : 'default';
		} else if ($(data).find('learningObject').attr('logoRHide') != 'true' && $(data).find('learningObject').attr('theme') != undefined && $(data).find('learningObject').attr('theme') != 'default') {
			type = 'theme';
			$('#overview .logoR img').attr('src', themePath + $(data).find('learningObject').attr('theme') + '/logo.png');
		}
		if ((type == undefined || type == 'theme') && $(data).find('learningObject').attr('logoRHide') == 'true') {
			$('#overview .logoR img').removeAttr('src');
		} else {
			checkExists('logoR', type, fallback);
		}

		var type, fallback;
		if ($(data).find('learningObject').attr('logoL') != undefined && $(data).find('learningObject').attr('logoL') != '') {
			$('#overview .logoL img').attr('src', $(data).find('learningObject').attr('logoL'));
			$('#overview .logoL img').attr('alt', $(data).find('learningObject').attr('logoLAlt'));
			type = 'LO';
			fallback = $(data).find('learningObject').attr('theme') != undefined && $(data).find('learningObject').attr('theme') != "default" ? 'theme' : 'default';
		} else if ($(data).find('learningObject').attr('logoLHide') != 'true' && $(data).find('learningObject').attr('theme') != undefined && $(data).find('learningObject').attr('theme') != 'default') {
			type = 'theme';
			$('#overview .logoL img').attr('src', themePath + $(data).find('learningObject').attr('theme') + '/logo_left.png');
		}
		if ((type == undefined || type == 'theme') && $(data).find('learningObject').attr('logoLHide') == 'true') {
			$('#overview .logoL img').removeAttr('src');
		} else {
			checkExists('logoL', type, fallback);
		}

		// apply all the header css optional properties
		var $jumbotron = $(".jumbotron");
		if ($(data).find('learningObject').attr('headerColour') != undefined && $(data).find('learningObject').attr('headerColour') != '' && $(data).find('learningObject').attr('headerColour') != '0x') {
			if ($(data).find('learningObject').attr('headerColour').indexOf('rgb(') >= 0) {
				$jumbotron.css('background-color', formatColour($(data).find('learningObject').attr('headerColour')));
			} else {
				// gradients can be entered in colour picker in format '#FF0000,#FFFF00'
				var tempCol = $(data).find('learningObject').attr('headerColour');
				tempCol = tempCol.split(',');
				if (tempCol.length == 1) {
					tempCol.push(tempCol[0]);
				}
				tempCol[0] = formatColour(tempCol[0]);
				tempCol[1] = formatColour(tempCol[1]);
				$jumbotron.css('background', tempCol[0]);
				$jumbotron.css('background', '-moz-linear-gradient(45deg,  ' + tempCol[0] + ' 0%, ' + tempCol[1] + ' 100%)');
				$jumbotron.css('background', '-webkit-gradient(linear, left bottom, right top, color-stop(0%,' + tempCol[0] + '), color-stop(100%,' + tempCol[1] + '))');
				$jumbotron.css('background', '-webkit-linear-gradient(45deg,  ' + tempCol[0] + ' 0%,' + tempCol[1] + ' 100%)');
				$jumbotron.css('background', '-o-linear-gradient(45deg,  ' + tempCol[0] + ' 0%,' + tempCol[1] + ' 100%)');
				$jumbotron.css('background', '-ms-linear-gradient(45deg,  ' + tempCol[0] + ' 0%,' + tempCol[1] + ' 100%)');
				$jumbotron.css('background', 'linear-gradient(45deg,  ' + + ' 0%,' + tempCol[1]+ ' 100%)');
				$jumbotron.css('filter', 'progid:DXImageTransform.Microsoft.gradient( startColorstr=' + tempCol[0] + ', endColorstr=' + tempCol[1] + ',GradientType=1 )');
			}
		}
		if ($(data).find('learningObject').attr('header') != undefined && $(data).find('learningObject').attr('header') != '') {
			$jumbotron.css('background-image', "url('" + $(data).find('learningObject').attr('header') + "')");
		}
		if ($(data).find('learningObject').attr('headerPos') != undefined) {
			$jumbotron.css('background-position', $(data).find('learningObject').attr('headerPos'));
		}
		if ($(data).find('learningObject').attr('headerRepeat') != undefined) {
			$jumbotron.css('background-repeat', $(data).find('learningObject').attr('headerRepeat'));
		}
		if ($(data).find('learningObject').attr('headerTextColour') != undefined && $(data).find('learningObject').attr('headerTextColour') != '' && $(data).find('learningObject').attr('headerTextColour') != '0x') {
			$jumbotron.find('#pageTitle, #pageSubTitle').css('color', formatColour($(data).find('learningObject').attr('headerTextColour')));
		}

	}

	// store initial header css as it might be needed later if page level header optional property is used
	var $jumbotron = $(".jumbotron");
	defaultHeaderCss = {
		header: $jumbotron.css('background-image'),
		headerPos: $jumbotron.css('background-position'),
		headerRepeat: $jumbotron.css('background-repeat'),
		headerColour: $jumbotron.css('background-color'),
		headerTextColour: $jumbotron.find('#pageTitle').css('color')
	};

    // --------------- Optional Navigation Bar properties --------------------

	//temporary non-language option fix for collapse button aria label
	$(".btn.btn-navbar").attr("aria-label", "collapse");

    if ($(data).find('learningObject').attr('navbarHide') != undefined && $(data).find('learningObject').attr('navbarHide') != 'false'){

		$(".navbar-inner").remove();

	} else {

		// nav bar can be moved below header bar
		if ($(data).find('learningObject').attr('navbarPos') != undefined && $(data).find('learningObject').attr('navbarPos') == 'below'){

			$('#overview').after('<div id="pageLinks"></div>');
			$('.navbar').appendTo('#pageLinks');

		}

		// apply all the nav bar css optional properties
		if ($(data).find('learningObject').attr('navbarColour') != undefined && $(data).find('learningObject').attr('navbarColour') != '' && $(data).find('learningObject').attr('navbarColour') != '0x') {
			var $navBar = $('.navbar-inverse .navbar-inner');

			if ($(data).find('learningObject').attr('navbarColour').indexOf('rgb(') >= 0) {
				$navBar.css('background-color', formatColour($(data).find('learningObject').attr('navbarColour')));
			} else {
				// gradients can be entered in colour picker in format '#FF0000,#FFFF00'
				var tempCol = $(data).find('learningObject').attr('navbarColour');
				tempCol = tempCol.split(',');
				if (tempCol.length == 1) {
					tempCol.push(tempCol[0]);
				}
				tempCol[0] = formatColour(tempCol[0]);
				tempCol[1] = formatColour(tempCol[1]);
				$navBar.css('background', tempCol[0]);
				$navBar.css('background', '-moz-linear-gradient(45deg,  ' + tempCol[0] + ' 0%, ' + tempCol[1] + ' 100%)');
				$navBar.css('background', '-webkit-gradient(linear, left bottom, right top, color-stop(0%,' + tempCol[0] + '), color-stop(100%,' + tempCol[1] + '))');
				$navBar.css('background', '-webkit-linear-gradient(45deg,  ' + tempCol[0] + ' 0%,' + tempCol[1] + ' 100%)');
				$navBar.css('background', '-o-linear-gradient(45deg,  ' + tempCol[0] + ' 0%,' + tempCol[1] + ' 100%)');
				$navBar.css('background', '-ms-linear-gradient(45deg,  ' + tempCol[0] + ' 0%,' + tempCol[1] + ' 100%)');
				$navBar.css('background', 'linear-gradient(45deg,  ' + + ' 0%,' + tempCol[1]+ ' 100%)');
				$navBar.css('filter', 'progid:DXImageTransform.Microsoft.gradient( startColorstr=' + tempCol[0] + ', endColorstr=' + tempCol[1] + ',GradientType=1 )');
			}
		}

		var navBarText = $('.nav li a').css('color');
		if ($(data).find('learningObject').attr('navbarTextColour') != undefined && $(data).find('learningObject').attr('navbarTextColour') != '' && $(data).find('learningObject').attr('navbarTextColour') != '0x') {
			navBarText = formatColour($(data).find('learningObject').attr('navbarTextColour'));
			$('.nav li a').css('color', navBarText);
		}
		if ($(data).find('learningObject').attr('navbarTextHoverColour') != undefined && $(data).find('learningObject').attr('navbarTextHoverColour') != '' && $(data).find('learningObject').attr('navbarTextHoverColour') != '0x') {
			var navBarTextHover = formatColour($(data).find('learningObject').attr('navbarTextHoverColour'));
			$('.nav li a').hover(
				function() { $(this).css('color', navBarTextHover); },
				function() { $(this).css('color', navBarText); }
			);
		}
	}

	// --------------- Optional Footer properties --------------------

    if ($(data).find('learningObject').attr('footerHide') != undefined && $(data).find('learningObject').attr('footerHide') != 'false'){

		$('.footer').remove();

	} else {

		// add & position custom footer
		if ($(data).find('learningObject').attr('customFooter') != undefined && $(data).find('learningObject').attr('customFooter') != ''){
			var customFooterContent=$(data).find('learningObject').attr('customFooter');

			if ($(data).find('learningObject').attr('footerPos') != undefined && $(data).find('learningObject').attr('footerPos') == 'above'){

			$('.footer .container .row-fluid').before('<div id="customFooter">'+customFooterContent+'</div>');
			$("#customFooter").css({"margin-bottom": "10px"});
			}

			if ($(data).find('learningObject').attr('footerPos') != undefined && $(data).find('learningObject').attr('footerPos') == 'below'){

			$('.footer .container .row-fluid').append('<div id="customFooter">'+customFooterContent+'</div>');
			$("#customFooter").css({"margin-top": "40px"});
			}

			if ($(data).find('learningObject').attr('footerPos') != undefined && $(data).find('learningObject').attr('footerPos') == 'replace'){
				var wcagDefault=$(".wcagLink").html();
			$('.footer .container').remove();
			$('.footer').append('<div id="customFooter">'+customFooterContent+'</div>');
				$("#customFooter").css({"margin-left": "10px"});
				$('#customFooter').append('<div class="wcagLink">'+wcagDefault+'</div>');
				$(".wcagLink").css({"margin-right": "10px", "margin-top":"10px"});

			}
		}

		//populate wcag logo and link and/or hide it
		$(".wcagLink").removeClass("hidden");
		if ($(data).find('learningObject').attr('wcagAlt') != undefined){
			$(".wcagLogo").attr("alt",$(data).find('learningObject').attr('wcagAlt'));
		}
		if ($(data).find('learningObject').attr('wcagLinkTitle') != undefined){
			$(".wcagLink a").attr("title",$(data).find('learningObject').attr('wcagLinkTitle'));
		}
		if ($(data).find('learningObject').attr('wcagLink') != undefined && $(data).find('learningObject').attr('wcagLink') != ""){
			$(".wcagLink a").prop("href",$(data).find('learningObject').attr('wcagLink'));
		}
		if ($(data).find('learningObject').attr('wcagHide') != undefined && $(data).find('learningObject').attr('wcagHide') == 'true'){
			$('.wcagLink').remove();
		}

		// Change footer background colour
		if ($(data).find('learningObject').attr('footerColour') != undefined && $(data).find('learningObject').attr('footerColour') != ''){
			var $footer = $('.footer');
			if ($(data).find('learningObject').attr('footerColour').indexOf('rgb(') >= 0) {
				$footer.css('background-color', formatColour($(data).find('learningObject').attr('footerColour')));
			} else {
				// gradients can be entered in colour picker in format '#FF0000,#FFFF00'
				var tempCol = $(data).find('learningObject').attr('footerColour');
				tempCol = tempCol.split(',');
				if (tempCol.length == 1) {
					tempCol.push(tempCol[0]);
				}
				tempCol[0] = formatColour(tempCol[0]);
				tempCol[1] = formatColour(tempCol[1]);
				$footer.css('background', tempCol[0]);
				$footer.css('background', '-moz-linear-gradient(45deg,  ' + tempCol[0] + ' 0%, ' + tempCol[1] + ' 100%)');
				$footer.css('background', '-webkit-gradient(linear, left bottom, right top, color-stop(0%,' + tempCol[0] + '), color-stop(100%,' + tempCol[1] + '))');
				$footer.css('background', '-webkit-linear-gradient(45deg,  ' + tempCol[0] + ' 0%,' + tempCol[1] + ' 100%)');
				$footer.css('background', '-o-linear-gradient(45deg,  ' + tempCol[0] + ' 0%,' + tempCol[1] + ' 100%)');
				$footer.css('background', '-ms-linear-gradient(45deg,  ' + tempCol[0] + ' 0%,' + tempCol[1] + ' 100%)');
				$footer.css('background', 'linear-gradient(45deg,  ' + + ' 0%,' + tempCol[1]+ ' 100%)');
				$footer.css('filter', 'progid:DXImageTransform.Microsoft.gradient( startColorstr=' + tempCol[0] + ', endColorstr=' + tempCol[1] + ',GradientType=1 )');
			}

		}


		// Hide or show the social media buttons
		$(".addthis_sharing_toolbox").hide();
		setTimeout(function () {
			var count_hidden = count_undef = 0,
					value, social = [
						'facebook',
						'twitter',
						['google', 'google_plusone_share'],
						'linkedin',
						'scoopit',
						['pinterest', 'pinterest_share'],
						'email',
						'yammer',
						['addthis', 'compact']
					];

			$(social).each(function(i, item) {
				value = $.isArray(item) ? $(data).find('learningObject').attr(item[0]) : $(data).find('learningObject').attr(item);

				if (value == undefined) {
					count_undef++;
				}
				else if (value == 'false') {
					$(".at-svc-" + ($.isArray(item) ? item[1] : item)).hide();
					count_hidden++;
				}
			});

			if (
				(count_hidden > 0 && count_hidden < social.length) ||
				(count_hidden == 0 && count_undef == 0) ||
				count_undef == social.length
			) {
				$(".addthis_sharing_toolbox").show();
			}
		}, 2000);

	}

	// script optional property added before any content loads
	var script = $(data).find('learningObject').attr('script');
	if (script != undefined && script != "") {
		$("head").append('<script>' +  script + '</script>');
	}

}

// add link around all examples of glossary words in text
function x_insertGlossaryText(node) {
	var temp = document.createElement("pre");
	temp.innerHTML = node;
	var tempText = temp.innerHTML;

	if (glossary.length > 0) {
		for (var k=0, len=glossary.length; k<len; k++) {
			var regExp = new RegExp('(^|[\\s\(>]|&nbsp;)(' + glossary[k].word + ')([\\s\\.,!?:;\)<]|$|&nbsp;)', 'i');
			tempText = tempText.replace(regExp, '$1{|{'+k+'::$2}|}$3');
		}
		for (var k=0, len=glossary.length; k<len; k++) {
			var regExp = new RegExp('(^|[\\s\(>]|&nbsp;)(\\{\\|\\{' + k + '::(.*?)\\}\\|\\})([\\s\\.,!?:;\)<]|$|&nbsp;)', 'i');
			tempText = tempText.replace(regExp, '$1<a class="glossary" href="#" def="' + glossary[k].definition.replace(/\"/g, "'") + '">$3</a>$4');
		}
	}

	return tempText;
}

// check through text nodes for text that needs replacing with something else (e.g. glossary)
function x_checkForText(data, type) {
	for (var i=0; i<data.length; i++) {
		if (data[i].childNodes.length > 0) {
			if (data[i].nodeName == 'text') {
				if (type == 'glossary') {
					if ($(data[i]).attr('disableGlossary') != 'true') {
						data[i].childNodes[0].data = x_insertGlossaryText(data[i].childNodes[0].data);
					}
				} else if (type == 'iframe') {
					function changeProtocol(iframe) {
						if (/src="http:/.test(iframe)){
							iframe = iframe.replace(/src="http:/g, 'src="https:').replace(/src='http:/g, "src='https:");
						}
						return iframe;
					}
					data[i].childNodes[0].data = data[i].childNodes[0].data.replace(/(<iframe([\s\S]*?)<\/iframe>)/g, changeProtocol);
				} else if (type == 'variables') {
					data[i].childNodes[0].data = XBOOTSTRAP.VARIABLES.replaceVariables(data[i].childNodes[0].data);
				} else if (type == 'globalVars') {
					data[i].childNodes[0].data = XBOOTSTRAP.GLOBALVARS.replaceGlobalVars(data[i].childNodes[0].data);
				}

			} else {
				x_checkForText(data[i].childNodes, type);
			}
		}
	}
}

// called from links added through the wysiwyg editor button (& the links created as a result of searches
function x_navigateToPage(force, pageInfo) { // pageInfo = {type, ID}
	var pages = $(data).find('page'),
		links = ['[first]', '[last]', '[previous]', '[next]'];

	// First look for the fixed links (first/last/previous/next)
	if ($.inArray(pageInfo.ID, links) > -1) {
		var tempNum,
			tempPageIndex;

		// first page
		if ($.inArray(pageInfo.ID, links) == 0) {
			tempPageIndex = validPages[0];

		// last valid page
		} else if ($.inArray(pageInfo.ID, links) == 1) {
			tempPageIndex = validPages[validPages.length-1];

		// previous valid page
		} else if ($.inArray(pageInfo.ID, links) == 2) {
			// if it's a standalone page or the first page in the project then there is no previous page to navigate to
			var currentIndex = $.inArray(currentPage, validPages);
			if (currentIndex > 0) {
				tempPageIndex = validPages[currentIndex-1];
			}

		// next valid page
		} else {
			// if it's a standalone page or the last page in the project then there is no next page to navigate to
			var currentIndex = $.inArray(currentPage, validPages);
			if (currentIndex != -1 && currentIndex < validPages.length-1) {
				tempPageIndex = validPages[currentIndex+1];
			}
		}

		if (tempPageIndex != undefined) {
			parseContent({ type: "index", id: tempPageIndex });
		}

	// Then try to look them up by ID
	} else {
		var found = false;

		for (var i=0; i<pages.length; i++) {
			// link to page
			if (pages[i].getAttribute("linkID") == pageInfo.ID) {
				var destination = pageInfo.ID;
				if (pages[i].getAttribute("customLinkID") != undefined && pages[i].getAttribute("customLinkID") != "") {
					// page has customID so use this instead of auto-generated linkID
					destination = pages[i].getAttribute("customLinkID");
				}
				parseContent({ type: "id", id: destination });
				found = true;
				break;
			}

			// link to section
			if (pages[i].childNodes.length > 0) {
				for (var j=0; j<pages[i].childNodes.length; j++) {
					if (pages[i].childNodes[j].getAttribute && pages[i].childNodes[j].getAttribute("linkID") == pageInfo.ID) {
						var destination = pages[i].getAttribute("linkID");
						if (pages[i].getAttribute("customLinkID") != undefined && pages[i].getAttribute("customLinkID") != "") {
							// page has customID so use this instead of auto-generated linkID
							destination = pages[i].getAttribute("customLinkID");
						}
						parseContent({ type: "id", id: destination }, j+1);
						found = true;
						break;
					}
				}
			}

			if (found == true) {
				break;
			}
		}

		if (found == false) {
			console.log("Page/section with ID *" + pageInfo.ID + "* not found");
		}
	}
}

// function loads a new page
function parseContent(pageRef, sectionNum, contentNum, addHistory) {
	// pageRefType determines how pageID should be dealt with
	// can be 'index' (of page in data), 'id' (linkID/customLinkID, 'start' or 'check' (these last two could be index or id so extra checks are needed)
	var pageRefType = pageRef.type,
		pageID = pageRef.id,
		found = false;

	// check if pageIndex exists & can be shown
	var pageIndex;

	// pageID might be an ID - see if it matches either a linkID or a customLinkID
	if (pageRefType != 'index') {
		$(data).find('page').each(function(index, value) {
			var $page = $(this);
			if (pageID == $page.attr('linkID') || pageID == $page.attr('customLinkID')) {
				// an ID match has been found
				pageIndex = index;
				found = true;
				pageRefType = 'id';

				return false;
			}
		});
	}

	// check if it's a valid page index
	if (pageRefType != 'id') {
		pageID = $.isNumeric(pageID) ? Number(pageID) : pageID;

		if (Number.isInteger(pageID)) {
			// pageID refers to actual page num of valid pages - need to convert to index of all pages
			if (pageRefType == 'start' || pageRefType == 'check') {
				pageID = validPages[pageID];
			}

			if ($.inArray(pageID, validPages) > -1) {
				// this is a valid page (not hidden or standalone - standalone pages are called by their ID)
				pageIndex = pageID;
				found = true;
				pageRefType = 'index';

			} else {
				console.log("Page *" + (pageID+1) + "* not found");
			}

		} else {
			console.log("Page with ID *" + pageID + "* not found");
		}

	} else if (found == false) {
		console.log("No valid page with ID or index *" + pageID + "* is found");
	}

	// fallback to show 1st page in project
	if (found == false) {
		// project contains no pages or pageIndex is too high
		if (validPages.length == 0) {
			pageIndex = 0;
		} else {
			pageIndex = validPages[0];
		}
	}

	var standAlonePage = $(data).find('page').eq(pageIndex).attr('linkPage') == 'true' ? true : false;

	if (currentPage != pageIndex) {
		// Page doesn't exist or is a hidden & author support is off
		if ($(data).find('page').eq(pageIndex).attr('hidePage') == 'true' && authorSupport == false) {
			console.log("Page *" + (pageIndex+1) + "* is hidden");
			pageIndex = validPages[0];

		// Page exists & can be shown
		} else {

			var page = $(data).find('page').eq(pageIndex);
			var pageHash = page.attr('customLinkID') != undefined && page.attr('customLinkID') != '' ? page.attr('customLinkID') : (standAlonePage ? page.attr('linkID') : 'page' + (validPages.indexOf(pageIndex)+1));

			// Load page as normal as it's not opening in a new window
			if (!standAlonePage || (standAlonePage && $(data).find('page').eq(pageIndex).attr('newWindow') != 'true') || (window.location.href.split('section')[0] == window.location.href.split('section')[0].split('#')[0] + '#' + pageHash) || pageRefType == 'start') {

				// make sure correct hash is used in url history
				if (addHistory != false) {
					var historyEntry = pageHash.substring(0,4) == "page" ? Number(pageHash.substring(4)) - 1 : pageHash;

					if (pageHistory[pageHistory.length-1] != historyEntry) {
						pageHistory.push(historyEntry);
					}

					window.history.pushState('window.location.href',"",'#' + pageHash);
				}

				//clear out existing content
				$('#mainContent').empty();
				$('#toc').empty();

				// store current page
				currentPage = pageIndex;

				//set the main page title and subtitle
				$('#pageTitle').html(page.attr('name'));
				$(document).prop('title', $('<p>' + page.attr('name') +' - ' + $(data).find('learningObject').attr('name') + '</p>').text());
				if ($(".jumbotron").length > 0) {
					// header bar can be hidden on standalone pages
					if (standAlonePage && page.attr('headerHide') == 'true') {
						$(".jumbotron").hide();

					} else {
						setHeaderFormat(page.attr('header'), page.attr('headerPos'), page.attr('headerRepeat'), page.attr('headerColour'), page.attr('headerTextColour'));
						$(".jumbotron").show();
					}
				}

				// nav bar can be hidden on standalone pages
				if ($(".navbar-inner").length > 0) {
					if (standAlonePage && page.attr('navbarHide') == 'hidden') {
						$(".navbar-inner").hide();

					} else {
						if (page.attr('navbarHide') == 'back') {
							$("#nav li:not(.backBtn)").hide();
							$("#nav .backBtn").show();
						} else {
							$("#nav li:not(.backBtn)").show();
							$("#nav .backBtn").hide();
						}

						$(".navbar-inner").show();
					}
				}

				var extraTitle = authorSupport == true && page.attr('hidePageInfo') != undefined && page.attr('hidePageInfo') != '' ? ' <span class="alertMsg">' + page.attr('hidePageInfo') + '</span>' : '';

				$('#pageSubTitle').html( page.attr('subtitle') + extraTitle);

				$('#overview').removeClass('hide');// show the header
				$('#topnav').removeClass('hide');// show the topnavbar

				//create the sections
				page.find('section').each( function(index, value){

					// work out whether the section is hidden or not - can be simply hidden or hidden between specific dates/times
					var hideSection = checkIfHidden($(this).attr('hidePage'), $(this).attr('hideOnDate'), $(this).attr('hideOnTime'), $(this).attr('hideUntilDate'), $(this).attr('hideUntilTime'), 'Section');
					if ($.isArray(hideSection)) {
						$(this).attr('hidePageInfo', hideSection[1]);
						hideSection = hideSection[0];
					}

					if (hideSection == false || authorSupport == true) {

						var sectionIndex = index;

						//expand mainContent if section menu hidden and expand option is true
						if (page.attr('sectionMenu') == 'true' && page.attr('expandMain') == 'true') {
							$('#mainContent').addClass("expandMain");

						}else{
							$('#mainContent').removeClass("expandMain");
						}

						// add section menu unless turned off
						if ($(this).attr('menu') != 'headings' && $(this).attr('menu') != 'neither' && page.attr('sectionMenu') != 'true') {

							//add a TOC entry
							var tocName = $(this).attr('name');

							// remove size & background color styles from links on toc
							if ($('<p>' + tocName + '</p>').children().length > 0) {
								tocName = $(tocName);
								tocName.css({ 'font-size': '', 'background-color': 'transparent' });
								tocName.find('[style*="font-size"]').css('font-size', '');
								tocName.find('[style*="background-color"]').css('background-color', 'transparent');
							}

							var $link = $('<li' + (index==0?' class="active"':'') +'><a href="#' + pageHash + 'section' + (index+1) + '"></a></li>').appendTo('#toc');
							$link.find('a').append(tocName);
						}

						//add the section header
						var extraTitle = authorSupport == true && $(this).attr('hidePageInfo') != undefined && $(this).attr('hidePageInfo') != '' ? ' <span class="alertMsg">' + $(this).attr('hidePageInfo') + '</span>' : '',
							links = $(this).attr('links') != undefined && $(this).attr('links') != "none" ? '<div class="sectionSubLinks ' + $(this).attr('links') + '"></div>' : '',
							subHeadings = ($(this).attr('menu') != 'menu' && $(this).attr('menu') != 'neither') ? '<h1>' + $(this).attr('name') + '</h1>' : '';

						var pageHeader = subHeadings + extraTitle + links != '' ? '<div class="page-header">' + subHeadings + extraTitle + links + '</div>' : '';

						var section = $('<section id="' + pageHash + 'section' + (index+1) + '">' + pageHeader + '</section>');

						//add the section contents
						$(this).children().each( function(itemIndex, value){
							if (($(this).attr('name') != '' && $(this).attr('name') != undefined && $(this).attr('showTitle') == 'true') || ($(this).attr('showTitle') == undefined && (this.nodeName == 'audio' || this.nodeName == 'video'))) {

								if ($(this).attr('showTitle') == 'true') {
									var subLinkName = $(this).attr('name');

									// remove size & background color styles from links on toc
									if ($('<p>' + subLinkName + '</p>').children().length > 0) {
										subLinkName = $(subLinkName);
										subLinkName.css({ 'font-size': '', 'background-color': 'transparent' });
										subLinkName.find('[style*="font-size"]').css('font-size', '');
										subLinkName.find('[style*="background-color"]').css('background-color', 'transparent');
									}
									
									var tempLink = validPages.indexOf(pageIndex) != -1 ? 'page' + (validPages.indexOf(pageIndex)+1) : (page.attr("customLinkID") != "" && page.attr("customLinkID") != undefined ? page.attr("customLinkID") : page.attr('linkID'));
									var $link = $('<span class="subLink"> ' + (section.find('.sectionSubLinks .subLink').length > 0 && section.find('.sectionSubLinks').hasClass('hlist') ? '| ' : '') + '<a href="#' + tempLink + 'section' + (index+1) + 'content' + (itemIndex+1) + '"></a> </span>').appendTo(section.find('.sectionSubLinks'));
									$link.find('a').append(subLinkName);

								}

								section.append( '<h2 id="' + pageHash + 'section' + (index+1) + 'content' + (itemIndex+1) + '">' + $(this).attr('name') + '</h2>');
							}

							if (this.nodeName == 'text'){
								section.append( '<p>' + $(this).text() + '</p>');
							}

							if (this.nodeName == 'script'){

								section.append( '<script>' + $(this).text() + '</script>');
							}

							if (this.nodeName == 'markup'){

								if ( $(this).attr('url') != undefined ){

									section.append( $('<div/>').load( $(this).attr('url') ));

								} else {

									section.append( $(this).text() );
								}

							}

							if (this.nodeName == 'link'){

								var url = $(this).attr('url');
								var winName = $(this).attr('windowName') != undefined ? $(this).attr('windowName') : 'win' + new Date().getTime() ;
								var options = '';
								options += $(this).attr('width') != undefined ? 'width=' + $(this).attr('width') + ',' : '';
								options += $(this).attr('height') != undefined ? 'height=' + $(this).attr('height') + ',' : '';
								options += $(this).attr('scrollbars') != undefined ? 'scrollbars=' + $(this).attr('scrollbars') + ',' : '';
								options += $(this).attr('location') != undefined ? 'location=' + $(this).attr('location') + ',' : '';
								options += $(this).attr('status') != undefined ? 'status=' + $(this).attr('status') + ',' : '';
								options += $(this).attr('titlebar') != undefined ? 'titlebar=' + $(this).attr('titlebar') + ',' : '';
								options += $(this).attr('toolbar') != undefined ? 'toolbar=' + $(this).attr('toolbar') + ',' : '';
								options += $(this).attr('resizable') != undefined ? 'resizable=' + $(this).attr('resizable') + ',' : '';

								section.append( '<p><a href="javascript:window.open(\'' + url + '\', \'' + winName + '\', \'' + options + '\');void(0)">' + $(this).attr('name') + '</a></p>' );

							}

							if (this.nodeName == 'canvas'){

								var style;

								if ( $(this).attr('style') != undefined){

									style = ' style="' + $(this).attr('style') + '" ';

								} else {

									style = '';

								}

								var cls;

								if ( $(this).attr('class') != undefined){

									cls = ' class="' + $(this).attr('class') + '" ';

								} else {

									cls = '';

								}

								section.append( '<p><canvas id="' + $(this).attr('id') + '" width="' + $(this).attr('width') + '" height="' + $(this).attr('height') + '"' + style + cls + '/></p>');

							}

							if (this.nodeName == 'image'){
								section.append('<p><img class="img-polaroid" src="' + $(this).attr('url') + '" title="' + $(this).attr('alt') + '" alt="' + $(this).attr('alt') + '"/></p>');
							}

							if (this.nodeName == 'audio'){
								section.append('<p><audio src="' + $(this).attr('url') + '" type="audio/mp3" id="player1" controls="controls" preload="none" width="100%"></audio></p>')
							}

							if (this.nodeName == 'video'){
								var videoInfo = setUpVideo($(this).attr('url'), $(this).attr('iframeRatio'), pageIndex + '_' + sectionIndex + '_' + itemIndex);
								section.append('<p>' + videoInfo[0] + '</p>');

								if (videoInfo[1] != undefined) {
									section.find('.vidHolder').last().data('iframeRatio', videoInfo[1]);
								}
							}

							if (this.nodeName == 'pdf'){
								section.append('<object id="pdfDoc"' + new Date().getTime() + ' data="' + $(this).attr('url') + '" type="application/pdf" width="100%" height="600"><param name="src" value="' + $(this).attr('url') + '"></object>');
							}

							if (this.nodeName == 'xot'){
								section.append(loadXotContent($(this)));
							}

							if (this.nodeName == 'navigator'){

								if ($(this).attr('type') == 'Tabs'){
									makeNav( $(this), section, 'tabs', sectionIndex, itemIndex );
								}

								if ($(this).attr('type') == 'Accordion'){
									makeAccordion( $(this), section, sectionIndex, itemIndex );
								}

								if ($(this).attr('type') == 'Pills'){
									makeNav( $(this), section, 'pills', sectionIndex, itemIndex);
								}

								if ($(this).attr('type') == 'Carousel'){
									makeCarousel(  $(this), section, sectionIndex, itemIndex );
								}
							}

						});

						if (section.find('.sectionSubLinks a').length == 0) {

							section.find('.sectionSubLinks').remove();

						}

						//a return to top button
						if ($(this).attr('menu') != 'menu' && $(this).attr('menu') != 'neither') {

							section.append( $('<p><br><a class="btn btn-mini pull-right" href="#">Top</a></p>'));

						}

						//add the section to the document
						$('#mainContent').append(section);

						// lightbox image links might also need to be added
						setUpLightBox(page, $(this));
					}
				});

				//finish initialising the piece now we have the content loaded
				initMedia($('audio,video:not(.navigator video)'));
				$('.vidHolder.iframe').each(function() {
					iframeInit($(this));
				});

				initSidebar();

				// Queue reparsing of MathJax - fails if no network connection
				try { MathJax.Hub.Queue(["Typeset",MathJax.Hub]); } catch (e){}

				// check text for variables - if found make sure it contains the current var value
				if (XBOOTSTRAP.VARIABLES && XBOOTSTRAP.VARIABLES.exist()) {
					XBOOTSTRAP.VARIABLES.updateVariable();
				}

				//$('body').scrollSpy('refresh'); //seems to cause a bunch of errors with tabs
				$('#toc a:first').tab('show');

				//an event for user defined code to know when loading is done
				$(document).trigger('contentLoaded');

				//force facebook / twitter objects to initialise
				//twttr.widgets.load(); // REMOVED??

				//FB.XFBML.parse(); // REMOVED??

			// Page is a stand alone page opening in a new window
			} else {
				window.open(window.location.href.split('#')[0] + '#' + pageHash + (sectionNum != undefined ? 'section' + sectionNum : ''));
			}
		}
	}

	XBOOTSTRAP.VARIABLES.handleSubmitButton();

	if (sectionNum != undefined) {

		var page = $(data).find('page').eq(pageIndex),
			pageTempInfo = page.attr('customLinkID') != undefined && page.attr('customLinkID') != '' ? page.attr('customLinkID') : (standAlonePage ? page.attr('linkID') : 'page' + (validPages.indexOf(pageIndex)+1));

		var contentInfo = contentNum != undefined ? 'content' + contentNum : '';

		goToSection(pageTempInfo + 'section' + sectionNum + contentInfo);

	} else {
		goToSection('alwaysTop');
	}
}

// Get the page / section info from the URL (called on project load & when page changed via browser fwd/back btns)
function getHashInfo(urlHash) {
	if (urlHash.length > 0) {
		var pageLink = urlHash[0] == '#' ? urlHash.substring(1) : urlHash,
			thisPage,
			thisSection,
			thisContent;

		var tempStartIndex = [];

		if (pageLink.substring(0,4) == "page") {
			tempStartIndex.push(4);

			if (pageLink.substring(tempStartIndex[0]).indexOf('section') > -1) {
				tempStartIndex.push(pageLink.indexOf('section'));
				thisPage = parseInt(pageLink.substring(tempStartIndex[0], tempStartIndex[1]), 10) - 1;

				if (pageLink.substring(tempStartIndex[1] + 7).indexOf('content') > -1) {
					tempStartIndex.push(pageLink.indexOf('content'));
					thisSection = parseInt(pageLink.substring(tempStartIndex[1] + 7, tempStartIndex[2]), 10);
					thisContent = parseInt(pageLink.substring(tempStartIndex[2] + 7), 10);
				} else {
					thisSection = parseInt(pageLink.substring(tempStartIndex[1] + 7), 10);
				}
			} else {
				thisPage = parseInt(pageLink.substring(tempStartIndex[0]), 10) - 1;
			}

			thisPage = thisPage < 0 ? 0 : thisPage;

		} else {
			if (pageLink.indexOf('section') > -1) {
				tempStartIndex.push(0);
				tempStartIndex.push(pageLink.indexOf('section'));
				thisPage = pageLink.substring(tempStartIndex[0], tempStartIndex[1]);

				if (pageLink.substring(tempStartIndex[1] + 7).indexOf('content') > -1) {
					tempStartIndex.push(pageLink.indexOf('content'));
					thisSection = parseInt(pageLink.substring(tempStartIndex[1] + 7, tempStartIndex[2]), 10);
					thisContent = parseInt(pageLink.substring(tempStartIndex[2] + 7), 10);
				} else {
					thisSection = parseInt(pageLink.substring(tempStartIndex[1] + 7), 10);
				}
			} else {
				thisPage = pageLink;
			}
		}

		return [thisPage, thisSection, thisContent];

	} else {
		return false;
	}
}

// browser back / fwd button will trigger this - manually make page change to match page hash info
window.onhashchange = function() {
	var pageSectionInfo = getHashInfo(window.location.hash),
		tempPage,
		tempSection,
		tempContent;

	if (pageSectionInfo != false) {
		tempPage = pageSectionInfo[0];
		tempSection = pageSectionInfo[1];
		tempContent = pageSectionInfo[2];

		parseContent({ type: "check", id: tempPage }, tempSection, tempContent, false);
	}

    var listID = Number(location.href.substr(location.href.length-1,1));
    setTimeout("updateMenu("+listID+")", 100);  //-- run 100 ms later to avoid the confliction with the original codes
}

function updateMenu(listID) {
	if (!$.isNumeric(listID)) {
		listID = 1;
	}
	
    var navUL = document.getElementById("toc");
    navLists = navUL.getElementsByTagName('li');
	
    for (i=0; i<navLists.length; i++) {
        if (i == listID-1) {
            navLists[i].className = "active";
        } else {
            navLists[i].className = "";
        }
    }
}

// jump to specified section of current page
function goToSection(pageId) {
	sectionJump = document.getElementById(pageId);
	if (sectionJump != undefined) {
		var top = sectionJump.offsetTop;
		window.scrollTo(0, top);
	}
}

// LO level header background settings will be overridden by individual page ones (& returned to LO settings if page contains no background properties)
function setHeaderFormat(header, headerPos, headerRepeat, headerColour, headerTextColour) {

	var $overview = $('#overview'),
		bgImg = '';

	if (header != undefined && header != '') {

		if (header != 'none') {

			bgImg = "url('" + header + "')";

		}

	} else {

		bgImg = defaultHeaderCss.header;

	}

	// bgImg could be a colour gradient & not image - only do repeat & position if it's an image
	if (bgImg.indexOf('url(') >= 0) {

		if (headerRepeat != undefined && headerRepeat != "") {

			bgImg += ' ' + headerRepeat;

		} else if (defaultHeaderCss.headerRepeat) {

			bgImg += ' ' + defaultHeaderCss.headerRepeat;

		} else {

			bgImg += ' repeat';

		}

		if (headerPos != undefined && headerPos != "") {

			bgImg += ' ' + headerPos;

		} else if (defaultHeaderCss.headerPos) {

			bgImg += ' ' + defaultHeaderCss.headerPos;

		} else {

			bgImg += ' 0% 0%';

		}

	}

	var col = '';

	if (headerColour != undefined && headerColour != '') {

		col = headerColour;

	} else if (defaultHeaderCss.headerColour != undefined && defaultHeaderCss.headerColour != '' && defaultHeaderCss.headerColour != '0x') {

		col = defaultHeaderCss.headerColour;

	}

	if (col != '' && col != '0x' && col != 'rgba(0, 0, 0, 0)') {

		if (col.indexOf('rgb(') >= 0) {

			$overview.css('background', formatColour(col) + ' ' + bgImg );

		} else {

			// gradients can be entered in colour picker in format '#FF0000,#FFFF00'
			var tempCol = col.split(',');
			if (tempCol.length == 1) {
				tempCol.push(tempCol[0]);
			}
			tempCol[0] = formatColour(tempCol[0]);
			tempCol[1] = formatColour(tempCol[1]);
			bgImg += ', ';

			$overview.css('background', tempCol[0]);
			$overview.css('background', bgImg + '-moz-linear-gradient(45deg,  ' + tempCol[0] + ' 0%, ' + tempCol[1] + ' 100%)');
			$overview.css('background', bgImg + '-webkit-gradient(linear, left bottom, right top, color-stop(0%,' + tempCol[0] + '), color-stop(100%,' + tempCol[1] + '))');
			$overview.css('background', bgImg + '-webkit-linear-gradient(45deg,  ' + tempCol[0] + ' 0%,' + tempCol[1] + ' 100%)');
			$overview.css('background', bgImg + '-o-linear-gradient(45deg,  ' + tempCol[0] + ' 0%,' + tempCol[1] + ' 100%)');
			$overview.css('background', bgImg + '-ms-linear-gradient(45deg,  ' + tempCol[0] + ' 0%,' + tempCol[1] + ' 100%)');
			$overview.css('background', bgImg + 'linear-gradient(45deg,  ' + + ' 0%,' + tempCol[1]+ ' 100%)');
			$overview.css('filter', 'progid:DXImageTransform.Microsoft.gradient( startColorstr=' + tempCol[0] + ', endColorstr=' + tempCol[1] + ',GradientType=1 )');
		}

	} else {

		$overview.css({
			'filter': '',
			'background': bgImg
		});

	}

	var txtCol = '';

	if (headerTextColour != undefined && headerTextColour != '' && headerTextColour != '0x') {

		txtCol = headerTextColour;

	} else {

		txtCol = defaultHeaderCss.headerTextColour;

	}

	$overview.find('#pageTitle, #pageSubTitle').css('color', formatColour(txtCol));

}

function makeNav(node,section,type, sectionIndex, itemIndex){

	var sectionIndex = sectionIndex;

	var itemIndex = itemIndex;

	var tabDiv = $( '<div class="navigator tabbable"/>' );

	if (type == 'tabs'){

		var tabs = $( '<ul class="nav nav-tabs" id="tab' + sectionIndex + '_' + itemIndex + '"/>' );

	}

	if (type == 'pills'){

		var tabs = $( '<ul class="nav nav-pills" id="tab' + sectionIndex + '_' + itemIndex + '"/>' );
	}

	var content = $( '<div class="tab-content" tabindex="0"/>' );

	var iframe = [],
		pdf = [],
		video = [];

	node.children().each( function(index, value){
		if (index == 0){

			tabs.append( $('<li class="active"><a href="#tab' + sectionIndex + '_' + itemIndex + '_' + index + '" data-toggle="tab">' + $(this).attr('name') + '</a></li>') );

			var tab = $('<div id="tab' + sectionIndex + '_' + itemIndex + '_' + index + '" class="tab-pane active" tabindex="0"/>')

		} else {

			tabs.append( $('<li><a href="#tab' + sectionIndex + '_' + itemIndex + '_' + index + '" data-toggle="tab">' + $(this).attr('name') + '</a></li>') );

			var tab = $('<div id="tab' + sectionIndex + '_' + itemIndex + '_' + index + '" class="tab-pane" tabindex="0"/>')

		}

		var i = index;

		$(this).children().each( function(x, value){

			if ($(this).attr('showTitle') == 'true' || ($(this).attr('showTitle') == undefined && (this.nodeName == 'audio' || this.nodeName == 'video'))) {
				tab.append('<p><b>' + $(this).attr('name') + '</b></p>');
			}

			if (this.nodeName == 'text'){
				tab.append( '<p>' + $(this).text() + '</p>');

				if ($(this).text().indexOf("<iframe") != -1 && $(this).text().indexOf("kaltura_player") != -1) {
					iframe.push(i);
				}
			}

			if (this.nodeName == 'image'){
				tab.append('<p><img class="img-polaroid" src="' + $(this).attr('url') + '" title="' + $(this).attr('alt') + '" alt="' + $(this).attr('alt') + '"/></p>');
			}

			if (this.nodeName == 'audio'){
				tab.append('<p><audio src="' + $(this).attr('url') + '" type="audio/mp3" id="player1" controls="controls" preload="none" width="100%"></audio></p>')
			}

			if (this.nodeName == 'video'){
				var videoInfo = setUpVideo($(this).attr('url'), $(this).attr('iframeRatio'), currentPage + '_' + sectionIndex + '_' + itemIndex + '_' + index);
				tab.append('<p>' + videoInfo[0] + '</p>');

				if (videoInfo[1] != undefined) {
					tab.find('.vidHolder').last().data('iframeRatio', videoInfo[1]);
				}

				video.push(tab.find('video'));
				video.push(tab.find('.vidHolder.iframe'));
			}

			if (this.nodeName == 'link'){

				var url = $(this).attr('url');
				var winName = $(this).attr('windowName') != undefined ? $(this).attr('windowName') : 'win' + new Date().getTime() ;
				var options = '';
				options += $(this).attr('width') != undefined ? 'width=' + $(this).attr('width') + ',' : '';
				options += $(this).attr('height') != undefined ? 'height=' + $(this).attr('height') + ',' : '';
				options += $(this).attr('scrollbars') != undefined ? 'scrollbars=' + $(this).attr('scrollbars') + ',' : '';
				options += $(this).attr('location') != undefined ? 'location=' + $(this).attr('location') + ',' : '';
				options += $(this).attr('status') != undefined ? 'status=' + $(this).attr('status') + ',' : '';
				options += $(this).attr('titlebar') != undefined ? 'titlebar=' + $(this).attr('titlebar') + ',' : '';
				options += $(this).attr('toolbar') != undefined ? 'toolbar=' + $(this).attr('toolbar') + ',' : '';
				options += $(this).attr('resizable') != undefined ? 'resizable=' + $(this).attr('resizable') + ',' : '';

				tab.append( '<p><a href="javascript:window.open(\'' + url + '\', \'' + winName + '\', \'' + options + '\');void(0)">' + $(this).attr('name') + '</a></p>' );

			}

			if (this.nodeName == 'pdf'){

				tab.append('<object id="pdfDoc"' + new Date().getTime() + ' data="' + $(this).attr('url') + '#page=1&view=fitH" type="application/pdf" width="100%" height="600"><param name="src" value="' + $(this).attr('url') + '#page=1&view=fitH"></object>');
				pdf.push(tab.find('object'));

			}

			if (this.nodeName == 'xot'){
				tab.append(loadXotContent($(this)));
			}

		});

		content.append(tab);
	});

	tabDiv.append(tabs);

	tabDiv.append(content);

	section.append(tabDiv);

	setTimeout( function() {

		var $first = $('#tab' + sectionIndex + '_' + itemIndex + ' a:first');
		$first
			.tab("show")
			.parents(".tabbable").find(".tab-content .tab-pane.active iframe[id*='kaltura_player']").data("refresh", true);

		var $iframeTabs = $(),
			$pdfTabs = $(),
			$videoTabs = $();

		// fix for issue where firefox doesn't zoom pdfs correctly if not on 1st pane of navigators
		for (var i=0; i<pdf.length; i++) {
			$pdfTabs = $pdfTabs.add($(pdf[i]).parents('.tabbable').find('ul a[data-toggle="tab"]:eq(' + $(pdf[i]).parents('.tab-pane').index() + ')'));
		}

		$pdfTabs.on('shown.bs.tab', function (e) {
			if ($.browser.mozilla || $.browser.msie) {
				var $pdfRefresh = $(e.target).parents(".tabbable").find(".tab-content .tab-pane.active object[id*='pdfDoc']");
				if ($pdfRefresh.parent().data("refresh") != true) {
					$pdfRefresh.parent().data("refresh", true);
					$pdfRefresh.attr("data", $pdfRefresh.attr("data"));
				}
			}
		});

		// fix for issue where videos don't load correct height if not on 1st pane of navigators
		for (var i=0; i<iframe.length; i++) {
			$iframeTabs = $iframeTabs.add($('a[data-toggle="tab"]:eq(' + iframe[i] + ')'));
		}

		for (var i=0; i<video.length; i++) {
			$videoTabs = $videoTabs.add($(video[i]).parents('.tabbable').find('ul a[data-toggle="tab"]:eq(' + $(video[i]).parents('.tab-pane').index() + ')'));
		}

		$videoTabs.on('shown.bs.tab', function (e) {
			var $thisPane = $('#' + $(e.target).attr('href').substring(1));
			$thisPane.find(".vidHolder iframe").parents('.vidHolder').each(function() {
				iframeInit($(this));
			});
		});

		initMedia(tabDiv.find(".vidHolder video"));

		tabDiv.find('.vidHolder.iframe').each(function() {
			iframeInit($(this));
		});

	}, 0);

}

function makeAccordion(node,section, sectionIndex, itemIndex){

	var accDiv = $( '<div class="navigator accordion" id="acc' + sectionIndex + '_' + itemIndex + '">' );

	node.children().each( function(index, value){

		var group = $('<div class="accordion-group"/>');

		var header = $('<div class="accordion-heading"><a class="accordion-toggle" data-toggle="collapse" data-parent="#acc' + sectionIndex + '_' + itemIndex + '" href="#collapse' + sectionIndex + '_' + itemIndex + '_' + index + '">' + $(this).attr('name') + '</a></div>');

		group.append(header);

		if (index == 0){

			var outer = $('<div id="collapse' + sectionIndex + '_' + itemIndex + '_' + index + '" class="accordion-body collapse ' + (node[0].getAttribute('collapse') == 'true' ? "" : "in") + '"/>');

		} else {

			var outer = $('<div id="collapse' + sectionIndex + '_' + itemIndex + '_' + index + '" class="accordion-body collapse"/>');

		}


		var inner = $('<div class="accordion-inner" tabindex="0">');

		$(this).children().each( function(i, value){

			if (this.nodeName == 'text'){
				inner.append( '<p>' + $(this).text() + '</p>');
			}

			if (this.nodeName == 'image'){
				inner.append('<p><img class="img-polaroid" src="' + $(this).attr('url') + '" title="' + $(this).attr('alt') + '" alt="' + $(this).attr('alt') + '"/></p>');
			}

			if (this.nodeName == 'audio'){
				inner.append('<p><b>' + $(this).attr('name') + '</b></p><p><audio src="' + $(this).attr('url') + '" type="audio/mp3" id="player1" controls="controls" preload="none" width="100%"></audio></p>')
			}

			if (this.nodeName == 'video'){
				var videoInfo = setUpVideo($(this).attr('url'), $(this).attr('iframeRatio'), currentPage + '_' + sectionIndex + '_' + itemIndex + '_' + index);
				inner.append('<p><b>' + $(this).attr('name') + '</b></p><p>' + videoInfo[0] + '</p>');

				if (videoInfo[1] != undefined) {
					inner.find('.vidHolder').last().data('iframeRatio', videoInfo[1]);
				}
			}

			if (this.nodeName == 'link'){

				var url = $(this).attr('url');
				var winName = $(this).attr('windowName') != undefined ? $(this).attr('windowName') : 'win' + new Date().getTime() ;
				var options = '';
				options += $(this).attr('width') != undefined ? 'width=' + $(this).attr('width') + ',' : '';
				options += $(this).attr('height') != undefined ? 'height=' + $(this).attr('height') + ',' : '';
				options += $(this).attr('scrollbars') != undefined ? 'scrollbars=' + $(this).attr('scrollbars') + ',' : '';
				options += $(this).attr('location') != undefined ? 'location=' + $(this).attr('location') + ',' : '';
				options += $(this).attr('status') != undefined ? 'status=' + $(this).attr('status') + ',' : '';
				options += $(this).attr('titlebar') != undefined ? 'titlebar=' + $(this).attr('titlebar') + ',' : '';
				options += $(this).attr('toolbar') != undefined ? 'toolbar=' + $(this).attr('toolbar') + ',' : '';
				options += $(this).attr('resizable') != undefined ? 'resizable=' + $(this).attr('resizable') + ',' : '';

				inner.append( '<p><a href="javascript:window.open(\'' + url + '\', \'' + winName + '\', \'' + options + '\');void(0)">' + $(this).attr('name') + '</a></p>' );

			}

			if (this.nodeName == 'pdf'){
				inner.append('<object id="pdfDoc"' + new Date().getTime() + ' data="' + $(this).attr('url') + '" type="application/pdf" width="100%" height="600"><param name="src" value="' + $(this).attr('url') + '"></object>');
			}

			if (this.nodeName == 'xot'){
				inner.append(loadXotContent($(this)));
			}
		});

		outer.append(inner);

		group.append(outer);

		accDiv.append(group);
	});

	section.append(accDiv);

	setTimeout( function() {
		initMedia(accDiv.find('.vidHolder video'));
	}, 0);

}


function makeCarousel(node, section, sectionIndex, itemIndex){

	var video = [];

	var sectionIndex = sectionIndex;

	var itemIndex = itemIndex;

	var carDiv = $('<div id="car' + sectionIndex + '_' + itemIndex + '" class="navigator carousel slide"/>');

	if (node.attr('autoPlay') == 'true') {

		if ($.isNumeric(node.attr('delaySecs')) && node.attr('delaySecs') != '4') {

			carDiv.carousel({ interval: Number(node.attr('delaySecs')) * 1000 });

		}

		carDiv.carousel('cycle');

	}

	var indicators = $('<ol class="carousel-indicators"/>');

	var items = $('<div class="carousel-inner"/>');


	node.children().each( function(index, value){

		var pane;

		if (index == 0){

			indicators.append( $('<li data-target="#car' + sectionIndex + '_'  + itemIndex + '" data-slide-to="' + index + '" class="active"></li>') );

			pane = $('<div class="active item">');

		} else {

			indicators.append( $('<li data-target="#car' + sectionIndex + '_'  + itemIndex + '" data-slide-to="' + index + '"></li>') );

			pane = $('<div class="item">');
		}

		$(this).children().each( function(i, value){

			if (this.nodeName == 'text'){
				pane.append( '<p>' + $(this).text() + '</p>');
			}

			if (this.nodeName == 'image'){
				pane.append('<p><img class="img-polaroid" src="' + $(this).attr('url') + '" title="' + $(this).attr('alt') + '" alt="' + $(this).attr('alt') + '"/></p>');
			}

			if (this.nodeName == 'audio'){
				pane.append('<p><b>' + $(this).attr('name') + '</b></p><p><audio src="' + $(this).attr('url') + '" type="audio/mp3" id="player1" controls="controls" preload="none" width="100%"></audio></p>')
			}

			if (this.nodeName == 'video'){
				var videoInfo = setUpVideo($(this).attr('url'), $(this).attr('iframeRatio'), currentPage + '_' + sectionIndex + '_' + itemIndex + '_' + index);
				pane.append('<p><b>' + $(this).attr('name') + '</b></p><p>' + videoInfo[0] + '</p>');

				if (videoInfo[1] != undefined) {
					pane.find('.vidHolder').last().data('iframeRatio', videoInfo[1]);
				}

				video.push(pane.find('video'));
			}

			if (this.nodeName == 'link'){

				var url = $(this).attr('url');
				var winName = $(this).attr('windowName') != undefined ? $(this).attr('windowName') : 'win' + new Date().getTime() ;
				var options = '';
				options += $(this).attr('width') != undefined ? 'width=' + $(this).attr('width') + ',' : '';
				options += $(this).attr('height') != undefined ? 'height=' + $(this).attr('height') + ',' : '';
				options += $(this).attr('scrollbars') != undefined ? 'scrollbars=' + $(this).attr('scrollbars') + ',' : '';
				options += $(this).attr('location') != undefined ? 'location=' + $(this).attr('location') + ',' : '';
				options += $(this).attr('status') != undefined ? 'status=' + $(this).attr('status') + ',' : '';
				options += $(this).attr('titlebar') != undefined ? 'titlebar=' + $(this).attr('titlebar') + ',' : '';
				options += $(this).attr('toolbar') != undefined ? 'toolbar=' + $(this).attr('toolbar') + ',' : '';
				options += $(this).attr('resizable') != undefined ? 'resizable=' + $(this).attr('resizable') + ',' : '';

				pane.append( '<p><a href="javascript:window.open(\'' + url + '\', \'' + winName + '\', \'' + options + '\');void(0)">' + $(this).attr('name') + '</a></p>' );

			}

			if (this.nodeName == 'pdf'){
				pane.append('<object id="pdfDoc"' + new Date().getTime() + ' data="' + $(this).attr('url') + '" type="application/pdf" width="100%" height="600"><param name="src" value="' + $(this).attr('url') + '"></object>');
			}

			if (this.nodeName == 'xot'){
				pane.append(loadXotContent($(this)));
			}

		});

		items.append(pane);

	});

	carDiv.append(indicators);
	carDiv.append(items);
	carDiv.append( $('<a class="carousel-control left" href="#car' + sectionIndex + '_'  + itemIndex + '" data-slide="prev">&lsaquo;</a>') );
	carDiv.append( $('<a class="carousel-control right" href="#car' + sectionIndex + '_'  + itemIndex + '" data-slide="next">&rsaquo;</a>') );

	section.append(carDiv);

	setTimeout( function(){

		// fix for issue where videos don't load correct height if not on 1st pane of carousel
		carDiv.bind('slide.bs.carousel', function (e) {
			$(e.target).find('.vidHolder iframe').each(function() {
				iframeResize($(this));
			});
		});

		initMedia(carDiv.find('.vidHolder video'));

	}, 0);
}

function loadXotContent($this) {
	// get link & store url parameters to add back in later if not overridden
	var xotLink = $this.attr('link'),
		params = [],
		separator = xotLink.indexOf('.php?template_id') == -1 ? '?' : '&';

	xotLink = xotLink.indexOf('#resume=') != -1 ? xotLink.slice(0,xotLink.indexOf('#resume=')) : xotLink;

	if (xotLink.indexOf(separator) != -1) {
		params = xotLink.split(separator);
		if (separator == '?') {
			params.splice(1, 1, params[1].split('&'));
		}
		xotLink = params[0];
		params.splice(0,1);

		for (var i=0; i<params.length; i++) {
			params[i] = params[i].split('=');
		}
	}

	var hide = '';
	if ($this.attr('header') == 'true') { hide = 'top'; }
	if ($this.attr('footer') == 'true') { hide = hide == 'top' ? 'both' : 'bottom'; }
	xotLink += separator + 'hide=' + (hide != '' ? hide : 'none');
	separator = '&';

	if ($this.attr('pageNum') != undefined && $.isNumeric($this.attr('pageNum'))) {
		xotLink += separator + 'page=' + $this.attr('pageNum');
	}

	// the embed url parameter makes it responsive, full screen & hides minimise/maximise button (these can be overridden by manually adding other params to the url entered in editor)
	xotLink += separator + 'embed=true';

	// add back any url params that haven't been overridden
	for (var i=0; i<params.length; i++) {
		if (xotLink.indexOf(separator + params[i][0] + '=') == -1) {
			xotLink += separator + params[i][0] + '=' + params[i][1];
		}
	}

	// if project is being viewed as https then force iframe src to be https too
	if (window.location.protocol == "https:" && xotLink.indexOf("http:") == 0) {
		xotLink = "https:" + xotLink.substring(xotLink.indexOf("http:") + 5);
	}

	var warning = window.location.pathname.substring(window.location.pathname.lastIndexOf("/") + 1, window.location.pathname.length).indexOf("preview") != -1 && (xotLink.indexOf('preview_') != -1 || xotLink.indexOf('preview.php?') != -1) ? '<p class="alertMsg">' + (languageData.find("errorEmbed")[0] != undefined && languageData.find("errorEmbed")[0].getAttribute('label') != null ? languageData.find("errorEmbed")[0].getAttribute('label') : "You have embedded an XOT project preview. You must make the project public and embed the public facing URL.") + '</p>' : '',
		xotWidth = $this.attr('width') != undefined && ($.isNumeric($this.attr('width')) || $.isNumeric($this.attr('width').split('%')[0])) ? $this.attr('width') : '100%',
		xotHeight = $this.attr('height') != undefined && ($.isNumeric($this.attr('height')) || $.isNumeric($this.attr('height').split('%')[0])) ? $this.attr('height') : 600;

	return warning + '<iframe width="' + xotWidth + '" height="' + xotHeight + '" src="' + xotLink + '" frameborder="0" style="float:left; position:relative; top:0px; left:0px; z-index:0;"></iframe>';

}

var checkIfHidden = function(hidePage, hideOnDate, hideOnTime, hideUntilDate, hideUntilTime, type) {
	hidePage = hidePage == "true" ? true : false;

	if (hidePage == true) {
		// get current date/time according to browser
		var nowTemp = new Date();
		var now = {day:nowTemp.getDate(), month:nowTemp.getMonth()+1, year:nowTemp.getFullYear(), time:Number(String(nowTemp.getHours()) + (String(nowTemp.getMinutes()) < 10 ? '0' : '') + String(nowTemp.getMinutes()))};

		// functions to get hide on/until date/times from xml
		var hideOn, hideUntil,
			hideOnString = '', hideUntilString = '';
		var getDateInfo = function(dmy, hm) {
			// some basic checks of whether values are valid & then splits the data into time/day/month/year
			var tempDmy = dmy.split('/'), // original date format
				formatType = 0,
				format = [[0,1,2], [2,1,0]]; // d, m, y

			if (tempDmy.length == 3) {
				dmy = tempDmy;
			} else if (tempDmy.length == 1) {
				tempDmy = dmy.split('-'); // try the newer date format
				if (tempDmy.length == 3) {
					tempDmy.splice(2, 1, tempDmy[2].split('T')[0]);
					dmy = tempDmy;
					formatType = 1;
				} else {
					dmy = false;
				}

			} else {
				dmy = false;
			}

			if (dmy == false) {
				return [false];
			} else {
				var day = Math.max(1, Math.min(Number(dmy[format[formatType][0]]), 31)),
					month = Math.max(1, Math.min(Number(dmy[format[formatType][1]]), 12)),
					year = Math.max(Number(dmy[format[formatType][2]]), 2017),
					time = 0; // use midnight if no time is given

				if (hm != undefined && hm.trim() != '') {
					var hm = hm.split(':');
					if (hm.length == 2) {
						var hour = Math.min(Number(hm[0]), 23),
							minute = Math.min(Number(hm[1]), 59);
						time = Number(String(hour) + (minute < 10 ? '0' : '') + String(minute));
					}
				}
				return [{day:day, month:month, year:year, time:time}, (formatType == 0 ? day + '/' + month + '/' + year : year + '-' + month + '-' + day)];
			}
		}

		var getFullDate = function(info) {
			var timeZero = '';
			for (var i=0; i<4-String(info.time).length; i++) {
				timeZero += '0';
			}
			return Number(String(info.year) + (info.month < 10 ? '0' : '') + String(info.month) + (info.day < 10 ? '0' : '') + String(info.day) + timeZero + String(info.time));
		}

		var skipHideDateCheck = false,
			hideOnInfo,
			hideUntilInfo;

		if (hideOnDate != undefined && hideOnDate != '') {
			hideOnInfo = getDateInfo(hideOnDate, hideOnTime);
			hideOn = hideOnInfo[0];
		}

		if (hideUntilDate != undefined && hideUntilDate != '') {
			hideUntilInfo = getDateInfo(hideUntilDate, hideUntilTime);
			hideUntil = hideUntilInfo[0];
		}

		// if hide from & to date/times are identical then hide (to prevent issue with a previous release where these were never blank but pages should have been hidden)
		if (hideOnDate != undefined && hideOnDate != '' && hideUntilDate != undefined && hideUntilDate != '') {
			if (hideOn.day == hideUntil.day && hideOn.month == hideUntil.month && hideOn.year == hideUntil.year) {
				if (hideOnTime == hideUntilTime || hideOnTime == '' || hideUntilTime == '') {
					skipHideDateCheck = true;
				}
			}
		}

		if (skipHideDateCheck != true) {

			// is it hidden from a certain date? if so, have we passed that date/time?
			if (hideOnDate != undefined && hideOnDate != '') {
				if (hideOn != false) {
					if (hideOn.year > now.year || (hideOn.year == now.year && hideOn.month > now.month) || (hideOn.year == now.year && hideOn.month == now.month && hideOn.day > now.day) || (hideOn.year == now.year && hideOn.month == now.month && hideOn.day == now.day && hideOn.time > now.time)) {
						hidePage = false;
					}

					hideOnString = '{from}: ' + hideOnInfo[1] + ' ' + hideOnTime;
				}
			}

			// is it hidden until a certain date? if so, have we passed that date/time?
			if (hideUntilDate != undefined && hideUntilDate != '') {
				if (hideUntil != false) {
					// if hideUntil date is before hideOn date then the page is hidden/shown/hidden rather than shown/hidden/shown & it might need to be treated differently:
					var skip = false;
					if (hideOn != undefined && getFullDate(hideOn) > getFullDate(hideUntil)) {
						if (hidePage == false) {
							hidePage = true;
						} else {
							skip = true;
						}
					}

					if (skip != true && hidePage == true) {
						if (hideUntil.year < now.year || (hideUntil.year == now.year && hideUntil.month < now.month) || (hideUntil.year == now.year && hideUntil.month == now.month && hideUntil.day < now.day) || (hideUntil.year == now.year && hideUntil.month == now.month && hideUntil.day == now.day && hideUntil.time <= now.time)) {
							hidePage = false;
						}
					}

					hideUntilString = '{until}: ' + hideUntilInfo[1] + ' ' + hideUntilTime;
				}
			}
		}

		// put together the message that will appear in author support
		var infoString = '';
		if (hideOnString != '') {
			infoString += '(' + hideOnString;
		}
		if (hideUntilString != '') {
			if (infoString == '') { infoString += '('; } else { infoString += ' & '; }
			infoString += hideUntilString;
		}
		if (infoString != '') { infoString += ')'; }

		if (hidePage == true) {
			infoString = '{hidden} ' + infoString;
		} else {
			infoString = '{shown} ' + infoString;
		}

		var langData = languageData.find('hidden' + type)[0];
		infoString = infoString
			.replace('{from}', langData != undefined && langData.getAttribute('from') != "" && langData.getAttribute('from') != null ? langData.getAttribute('from') : 'Hide from')
			.replace('{until}', langData != undefined && langData.getAttribute('until') != "" && langData.getAttribute('until') != null ? langData.getAttribute('until') : 'Hide until')
			.replace('{hidden}', langData != undefined && langData.getAttribute('hidden') != "" && langData.getAttribute('hidden') != null ? langData.getAttribute('hidden') : 'This page is currently hidden in live projects')
			.replace('{shown}', langData != undefined && langData.getAttribute('shown') != "" && langData.getAttribute('shown') != null ? langData.getAttribute('shown') : 'This page is currently shown in live projects');

		return [hidePage, infoString];

	} else {
		return false;
	}
}

// adds html for videos - whether they are mp4s,youtube,vimeo (all played using mediaelement.js) or iframe embed code
function setUpVideo(url, iframeRatio, id) {

	function getAspectRatio(iframeRatio) {
		var iframeRatio = iframeRatio != "" && iframeRatio != undefined ? iframeRatio : '16:9';
		iframeRatio = iframeRatio.split(':');

		// iframe ratio can be one entered in editor or fallback to 16:9
		if (!$.isNumeric(iframeRatio[0]) || !$.isNumeric(iframeRatio[1])) {
			iframeRatio = [16,9];
		}

		return iframeRatio;
	}

	// iframe
	if (url.substr(0,7) == "<iframe") {

		// remove width & height attributes from iframe
		var iframe = $(url)
						.removeAttr('width')
						.removeAttr('height')
						.prop('outerHTML');

		return ['<div class="vidHolder iframe">' + iframe + '</div>', getAspectRatio(iframeRatio)];

	// mp4 / youtube / vimeo
	} else {

		var mimeType = 'mp4',
			vidSrc = url;

		// is it from youtube or vimeo?
		if (vidSrc.indexOf("www.youtube.com") != -1 || vidSrc.indexOf("//youtu") != -1) {
			mimeType = "youtube";
			iframeRatio = getAspectRatio(iframeRatio);

		} else if (vidSrc.indexOf("vimeo.com") != -1) {
			mimeType = "vimeo";
			iframeRatio = getAspectRatio(iframeRatio);

		}

		mimeType = 'video/' + mimeType;

		return ['<div class="vidHolder"><video src="' + vidSrc + '" type="' + mimeType + '" id="player' + id + '" controls="controls" preload="metadata" style="max-width: 100%" width="100%" height="100%"></video></div>', iframeRatio];
	}
}

// by default images can be clicked to open larger version in lightbox viewer - this can be overridden with optional properties at LO, page & section level
function setUpLightBox(thisPageInfo, thisSectionInfo) {
	if (thisSectionInfo.attr("lightbox") == "true" || (thisSectionInfo.attr("lightbox") != "false" && (thisPageInfo.attr("lightbox") == "true" || (thisPageInfo.attr("lightbox") != "false" && $(data).find('learningObject').attr('lightbox') != "false")))) {

		// use the x_noLightBox class to force images to not open in lightboxes
		$("#mainContent img:not('.x_noLightBox')").each(function( index ) {
			var $this = $(this);
			if ($this.closest('a').length == 0) {
				if (!$this.parent().hasClass('lightboxWrapper')) {
					var imgPath = $(this).prop('src');
					$(this)
						.wrap('<a data-featherlight="image" href="' + imgPath + '" class="lightboxWrapper">')
						.data('lightboxCaption', thisSectionInfo.attr("lightboxCaption"));
				}
			}
		});

		$.featherlight.prototype.afterContent = function(e) {
			var caption = this.$currentTarget == undefined ? undefined : this.$currentTarget.find('img').attr('alt'),
				sectionCaption = e == undefined ? undefined : $(e.target).data('lightboxCaption');

			if (caption != undefined && caption != '') {
				this.$instance.find('.featherlight-content img').attr('alt', caption);

				// by default no caption is shown in the lightbox because many people still leave the alt text fields with default 'Enter description for accessibility here' text
				// captions can be turned on at LO, page or section level
				var captionType = "false";
				if (sectionCaption != undefined) {
					captionType = sectionCaption;
				} else if (thisPageInfo.attr("lightboxCaption") != undefined) {
					captionType = thisPageInfo.attr("lightboxCaption");
				} else if ($(data).find('learningObject').attr("lightboxCaption") != undefined) {
					captionType = $(data).find('learningObject').attr("lightboxCaption");
				}

				if (captionType != "false") {
					this.$instance.find('.caption').remove();
					var before = captionType == "above" ? true : false;

					if (before == true) {
						$('<div class="lightBoxCaption">').text(caption).prependTo(this.$instance.find('.featherlight-content'));
					} else {
						$('<div class="lightBoxCaption">').text(caption).appendTo(this.$instance.find('.featherlight-content'));
					}
				}
			}
		}
	}
}

// handle case where comma decimal separator has been requested
function checkDecimalSeparator(value, forcePeriod) {
	if (forcePeriod == true) {
		// force convert to . so any dependant variables can be calculated correctly (can later be converted to , when shown on page)
		if ($(data).find('learningObject').attr('decimalseparator') !== undefined && $(data).find('learningObject').attr('decimalseparator') === 'comma') {
			var temp = value.replace(/\,/g, '.');
			if ($.isNumeric(temp)) {
				return temp;
			} else {
				return value;
			}
		} else {
			return value;
		}

	} else {
		// convert to , as it is to be shown on page
		if ($.isNumeric(value) && $(data).find('learningObject').attr('decimalseparator') !== undefined && $(data).find('learningObject').attr('decimalseparator') === 'comma') {
			return String(value).replace('.', ',');
		} else {
			return value;
		}
	}
}

// function returns correct phrase from language file or uses fallback if no matches / no language file
function getLangInfo(node, attribute, fallBack) {
    var string = fallBack;
    if (node != undefined && node != null) {
        if (attribute == false) {
            string = node.childNodes[0].nodeValue;
        } else {
            string = node.getAttribute(attribute);
        }
    }
    return string;
}




// _____ VARIABLES _____

var XBOOTSTRAP = (function ($, parent) { var self = parent.VARIABLES = {};

    // Declare local variables
	var	variables = [],
		variableInfo = [],
		variableErrors = [],
		dynamicCalcs = [],
		dynamicID = 1,
		varsChanged = false,

	// function starts the calculation of variables set by author via the variables optional property
	init = function (variableData) {

		// clears arrays if they have previously been calculated
		variables.splice(0, variables.length);
		variableInfo.splice(0, variableInfo.length);
		variableErrors.splice(0, variableErrors.length);

		var i, j, k, temp, thisVar,
			toCalc = [];

		variableInfo = variableData.split("||");

		// get array of data for all uniquely named variables & sort them so empty strings etc. become undefined
		for (i=0; i<variableInfo.length; i++) {
			var temp = variableInfo[i].split("|");
			thisVar = {name:$.trim(temp[0]), data:temp.slice(1), requires:[]}; // data = [fixed value, [random], min, max, step, decimal place, significant figure, trailing zero, [exclude], default]
			if (thisVar.name != "" && variableInfo.filter(function(a){ return a.name == thisVar.name }).length == 0) {
				for (j=0; j<thisVar.data.length; j++) {
					if (j == 1 || j == 8) { // convert data (random/exclude) to array
						thisVar.data.splice(j, 1, thisVar.data[j].split(","));
						for (k=0; k<thisVar.data[j].length; k++) {
							temp = $.trim(thisVar.data[j][k]);
							if (temp === "") {
								thisVar.data[j].splice(k, 1);
								k--;
							} else {
								thisVar.data[j].splice(k, 1, temp);
							}
						}
					} else {
						temp = $.trim(thisVar.data[j]);
						if (temp === "") {
							temp = undefined;
						}
						thisVar.data.splice(j, 1, temp);
					}
				}

				variableInfo.splice(i, 1, thisVar);
				toCalc.push(i);

			} else {
				variableInfo.splice(i, 1);
				i--;
			}
		}

		calcVariables(toCalc);
	},

	// Check if we have any variables to deal with
	exist = function () {
		return variables.length > 0;
	},

	calcVariables = function (toCalc) {
		var lastLength, checkDefault,
			thisVar, i;

		// goes through all variables and attempts to calculate their value
		// may loop several times if variables require other variable values to be ready before calculating their value
		// stops when no. var values calculated is no longer increasing - either all done or some vars can't be calculated (circular calculations or referencing non-existant vars)
		while (toCalc.length > 0 && (toCalc.length != lastLength || checkDefault == true)) {
			lastLength = toCalc.length;

			for (i=0; i<toCalc.length; i++) {
				thisVar = calcVar(variableInfo[toCalc[i]], false, checkDefault);
				if (thisVar.ok == true) {
					thisVar.requiredBy = [];
					variables.push(thisVar);
					toCalc.splice(i,1);
					i--;
					if (thisVar.default == true) {
						checkDefault = false;
					}
				} else if (thisVar.ok == false) {
					variableErrors.push(thisVar);
					toCalc.splice(i,1);
					i--;
				}

				if (i + 1 == toCalc.length && toCalc.length == lastLength) {
					checkDefault = checkDefault == true ? false : true;
				}
			}
		}

		for (i=0; i<toCalc.length; i++) {
			thisVar = variableInfo[toCalc[i]];
			thisVar.info = getLangInfo(languageData.find("authorVarsInfo").find("error")[0], "unable", "Unable to calculate") + ": " + getLangInfo(languageData.find("authorVarsInfo").find("info")[0], "undef", "References an undefined variable");
			variableErrors.push(thisVar);
			toCalc.splice(i,1);
			i--;
		}

		if (authorSupport == true && (variables.length > 0 || variableErrors.length > 0)) {
			$('#overview .titles').prepend('<span class="varMsg">' + '<a onclick="XBOOTSTRAP.VARIABLES.showVariables()" href="javascript:void(0)" class="alertMsg">' + getLangInfo(languageData.find("authorVars")[0], "label", "View variable data") + '</a></span>');
		}
	},

	// function calculates the value of any author set variables
	calcVar = function (thisVar, recalc, checkDefault) {
		thisVar.ok = undefined;

		// calculate min / max / step values
		var data = {min:thisVar.data[2], max:thisVar.data[3], step:thisVar.data[4]},
			exclude = [], index;

		for (var key in data) {
			if (Object.prototype.hasOwnProperty.call(data, key)) {
				// check for use of other variables & keep track of which are required
				if (data[key] != undefined && ((thisVar.data[0] == undefined && thisVar.data[1].length == 0) || key != "step")) {
					var info = getVarValues(data[key], thisVar.name);
					data[key] = info[0];
					if (info[1].length > 0) { thisVar.requires = thisVar.requires.concat(info[1].filter(function (item) { return thisVar.requires.indexOf(item) < 0; })); }

					thisVar.ok = info[2];
					if (thisVar.ok != true) { // a variable needed doesn't exist / hasn't been calculated yet
						break;
					} else {
						data[key] = Number(data[key]);
					}
				}
			}
		}

		// calculate exclude values
		if ((thisVar.ok == true || thisVar.ok == undefined) && thisVar.data[8].length > 0) {
			exclude = thisVar.data[8].slice();
			// check for use of other variables & keep track of which are required
			for (var i=0; i<exclude.length; i++) {
				var info = getVarValues(exclude[i], thisVar.name);
				exclude.splice(i, 1, info[0]);
				if (info[1].length > 0) { thisVar.requires = thisVar.requires.concat(info[1].filter(function (item) { return thisVar.requires.indexOf(item) < 0; })); }

				thisVar.ok = info[2];
				if (info[2] != true) {  // a variable needed doesn't exist / hasn't been calculated yet
					break;

				} else if (typeof exclude[i] === "string" && exclude[i].indexOf("&&") != -1) {
					// it's a range e.g. -2<&&<2 or -2<=&&<=2
					var temp = exclude[i].split("&&").filter(function (a) { return a.indexOf("<") > -1 || a.indexOf(">") > -1; });
					if (temp.length == 2) {
						temp.splice(0, 1, temp[0] + "[" + thisVar.name + "]");
						temp.splice(1, 1, "[" + thisVar.name + "]" + temp[1]);
						exclude.splice(i, 1, temp);
					}
				}
			}
		}

		// no missing dependancies so far
		if (thisVar.ok == true || thisVar.ok == undefined) {

			if (data.min != undefined && data.max != undefined && data.min > data.max) {
				// fail because min > max
				thisVar.ok = false;
				thisVar.info = getLangInfo(languageData.find("authorVarsInfo").find("error")[0], "unable", "Unable to calculate") + ": " + getLangInfo(languageData.find("authorVarsInfo").find("info")[0], "minMax", "min > max") + " (" + data.min + " > " + data.max + ")";

			} else if (thisVar.data[0] != undefined || thisVar.data[1].length > 0) {
				if (thisVar.data[0] != undefined) {
					// FIXED VALUE
					thisVar.type = "fixed";
					thisVar.value = thisVar.data[0];

					// check for use of other variables & keep track of which are required
					var info = getVarValues(thisVar.value, thisVar.name);
					thisVar.value = info[0];
					if (info[1].length > 0) { thisVar.requires = thisVar.requires.concat(info[1].filter(function (item) { return thisVar.requires.indexOf(item) < 0; })); }
					thisVar.ok = info[2];

				} else if (thisVar.data[1].length > 0) {
					// RANDOM FROM LIST
					thisVar.type = "random";

					index = Math.floor(Math.random()*thisVar.data[1].length);
					thisVar.value = thisVar.data[1][index];

					// check for use of other variables & keep track of which are required
					var info = getVarValues(thisVar.value, thisVar.name);
					thisVar.value = info[0];
					if (info[1].length > 0) { thisVar.requires = thisVar.requires.concat(info[1].filter(function (item) { return thisVar.requires.indexOf(item) < 0; })); }
					thisVar.ok = info[2];

				}

				if (thisVar.ok == true) {
					if (data.min != undefined && data.min > thisVar.value) {
						// fail because value < min
						if (thisVar.type == "random") {
							thisVar.ok = "retry";
						} else {
							thisVar.ok = false;
						}
						thisVar.info = getLangInfo(languageData.find("authorVarsInfo").find("error")[0], "invalid", "Invalid value") + ": " + getLangInfo(languageData.find("authorVarsInfo").find("info")[0], "valueMin", "value < min") + " (" + thisVar.value + " < " + data.min + ")";

					} else if (data.max != undefined && data.max < thisVar.value) {
						// fail because value > max
						if (thisVar.type == "random") {
							thisVar.ok = "retry";
						} else {
							thisVar.ok = false;
						}
						thisVar.info = getLangInfo(languageData.find("authorVarsInfo").find("error")[0], "invalid", "Invalid value") + ": " + getLangInfo(languageData.find("authorVarsInfo").find("info")[0], "valueMax", "value > max") + " (" + thisVar.value + " > " + data.max + ")";
					}
				}

			} else if (data.min != undefined || data.max != undefined) { // from max & min
				// RANDOM BETWEEN MIN & MAX VALUES
				thisVar.type = "minMax";

				// uses defaults of min=0 & max=100 if only min or max are set
				if (data.min == undefined) {
					data.min  = 0;
				} else if (data.max == undefined) {
					data.max = 100;
				}

				// use default of 1 for step
				if (data.step == undefined) {
					data.step = 1;
				}

				var maxDecimal = Math.max(Math.floor(data.min) === data.min ? 0 : data.min.toString().split(".")[1].length || 0, Math.floor(data.step) === data.step ? 0 : data.step.toString().split(".")[1].length || 0);
				thisVar.value = Math.floor(Math.random()*(((data.max - data.min) / data.step) + 1)) * data.step + data.min;
				if (thisVar.value > data.max) { thisVar.value = thisVar.value - data.step; } // can be over max if step doesn't take to exact max number - adjust for this
				thisVar.value = thisVar.value.toFixed(maxDecimal); // forces correct decimal num - should work without this but occasionally it ends up with e.g. 1.1999999999999.... instead of 1.2
				thisVar.ok = true;

			} else if (thisVar.type == undefined) {
				thisVar.ok = false;
				thisVar.info = getLangInfo(languageData.find("authorVarsInfo").find("error")[0], "none", "No variable data");
			}
		}

		if (thisVar.ok == true && $.isNumeric(Number(thisVar.value))) {
			// to significant figure
			if ($.isNumeric(Number(thisVar.data[6]))) {
				thisVar.value = Number(thisVar.value).toPrecision(Number(thisVar.data[6])).includes('e') ? parseFloat(Number(thisVar.value).toPrecision(Number(thisVar.data[6]))) : Number(thisVar.value).toPrecision(Number(thisVar.data[6]));
			}
			// to decimal place
			if ($.isNumeric(Number(thisVar.data[5]))) {
				thisVar.value = Number(thisVar.value).toFixed(Number(thisVar.data[5]));
				if (thisVar.data[7] != "true") {
					// remove trailing zeros
					thisVar.value = Number(thisVar.value);
				}
			}
		}

		// check value isn't one that should be excluded
		if (thisVar.ok == true) {
			for (var i=0; i<exclude.length; i++) {
				var clash = false;
				if (typeof exclude[i] == "number") {
					if (exclude[i] == thisVar.value) {
						clash = true;
					}

				// it's an exclude range
				} else if (typeof exclude[i] == "object") {
					for (var j=0; j<exclude[i].length; j++) {
						exclude[i].splice(j, 1, exclude[i][j].replace("[" + thisVar.name + "]", thisVar.value));
					}
					if (eval(exclude[i][0]) && eval(exclude[i][1])) {
						clash = true;
					}
				}

				if (clash == true) {
					if (thisVar.type == "fixed") {
						thisVar.ok = false;
						thisVar.info = getLangInfo(languageData.find("authorVarsInfo").find("error")[0], "invalid", "Invalid value") + ": " + getLangInfo(languageData.find("authorVarsInfo").find("info")[0], "exclude", "{n} is excluded").replace("{n}", thisVar.value);
					} else {
						thisVar.ok = "retry";
						thisVar.info = getLangInfo(languageData.find("authorVarsInfo").find("error")[0], "invalid", "Invalid value") + ": " + getLangInfo(languageData.find("authorVarsInfo").find("info")[0], "exclude", "{n} is excluded").replace("{n}", thisVar.value);
					}
					break;
				}
			}

		} else if (thisVar.ok == false && thisVar.info == undefined) {
			thisVar.info = getLangInfo(languageData.find("authorVarsInfo").find("error")[0], "unable", "Unable to calculate") + ": " + getLangInfo(languageData.find("authorVarsInfo").find("info")[0], "circular", "Circular variable reference");
		}

		// only retry random if there's a value that hasn't already failed
		if (thisVar.ok == "retry" && thisVar.type == "random") {
			thisVar.data[1].splice(index, 1);
			if (thisVar.data[1].length == 0) {
				thisVar.ok = false;
				thisVar.info = getLangInfo(languageData.find("authorVarsInfo").find("info")[0], "none", "All possible values are excluded or fall outside the min & max range");
			}
		}

		// retry multiple times to see if we can get a valid value
		if (thisVar.ok == "retry") {
			var attempts = 100;

			if (recalc != true) {
				var counter = 0;
				do {
					thisVar = calcVar(thisVar, true);
					counter++;
				} while (counter < attempts && thisVar.ok == "retry");

				if (thisVar.ok == "retry") {
					thisVar.ok = false;
					thisVar.info = " " + getLangInfo(languageData.find("authorVarsInfo").find("info")[0], "none2", "{n} attempts have not returned an accepted value").replace("{n}", attempts);
				} else if (thisVar.ok == true) {
					thisVar.info = getLangInfo(languageData.find("authorVarsInfo").find("info")[0], "attempts", "{n} attempts to calculate a valid value").replace("{n}", (counter + 1));
				}
			}
		}

		// fallback to default
		if (thisVar.data[9] != undefined && (thisVar.ok == false || checkDefault == true)) {
			try {
				var sum = eval(thisVar.data[9]);
				thisVar.value = sum;
			} catch (e) {
				thisVar.value = thisVar.data[9];
			}
			thisVar.requiredBy = [];
			thisVar.default = true;
			thisVar.ok = true;
			thisVar.info = getLangInfo(languageData.find("authorVarsInfo").find("info")[0], "default", "Fallback to default value");
		}

		return thisVar;
	},

	// function updates a variable update
	setVariable = function (name, value) {
		var dependants;

		for (var i=0; i<variables.length; i++) {
			if (variables[i].name == name) {
				variables[i].value = checkDecimalSeparator(value, true);
				dependants = variables[i].requiredBy;
				break;
			}
		}

		return dependants;
	},

	// function updates all variables on screen with the current value
	updateVariable = function () {

		if (varsChanged == true) {

			for (var i=0; i<$('.x_var').length; i++) {

				var $thisVarSpan = $($('.x_var')[i]),
					classes = $thisVarSpan.attr('class').split(' '),
					varName;

				for (var j=0; j<classes.length; j++) {
					if (classes[j].indexOf('x_var_') == 0) {
						varName = classes[j].substring(6);
						break;
					}
				}

				if (varName != '') {
					for (var j=0; j<variables.length; j++) {
						if (variables[j].name == varName) {
							$thisVarSpan.html(checkDecimalSeparator(variables[j].value));
							break;
						}
					}
				}
			}
		}
	},

	// function gets values of other variables needed for calculation and evals the value when everything's ready
	getVarValues = function (thisValue, thisName) {
		var requires = [];

		if (thisValue.indexOf("[" + thisName + "]") != -1) {
			return [thisValue, requires, false];
		}

		if (String(thisValue).indexOf("[") != -1) {
			for (var i=0; i<variables.length; i++) {
				if (thisValue.indexOf("[" + variables[i].name + "]") != -1) {
					// keeps track of what other variables reference this so they can be recalculated together if needed
					if (variables[i].requiredBy.indexOf(thisName) == -1) {
						variables[i].requiredBy.push(thisName);
					}
					requires.push(variables[i].name);

					RegExp.esc = function(str) {
						return str.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
					};
					var regExp = new RegExp(RegExp.esc("[" + variables[i].name + "]"), "g");
					thisValue = thisValue.replace(regExp, variables[i].value);
					if (thisValue.indexOf("[") == -1) { break; }
				}
			}
		}

		try {
			var sum = eval(thisValue);
			return [sum, requires, true];
		} catch (e) {
			if (thisValue.indexOf("[") == -1) {
				return [thisValue, requires, true]; // string
			} else {
				return [thisValue, requires, "variable"];
			}
		}
	},

	// function displays author set variables in popup when in author support mode
	showVariables = function () {
		var varHeadings = ["Name", "Fixed Value", "Random", "Min", "Max", "Step", "DP", "SF", "Trailing Zeros", "Exclude", "Default"];
		var pageText = '<html><body><style>table, tr, td, th { border: 1px solid black; text-align: left; } th { background-color: LightGray; } table { border-collapse: collapse; min-width: 100%; } th, td { padding: 1em; width: ' + (100/(varHeadings.length+1)) + '%; } .alert { color: red; } td:nth-child(1), td:nth-child(2) { font-weight: bold; } </style><table>',
			cells, temp, infoTxt;

		for (var i=0; i<varHeadings.length; i++) {
			pageText += '<th>' + getLangInfo(languageData.find("authorVars").find("item")[i], false, varHeadings[i]) + '</th>';
			if (i == 0) {
				pageText += '<th>' + getLangInfo(languageData.find("authorVars").find("item")[varHeadings.length], false, "Value") + '</th>';
			}
		}

		for (var i=0; i<variables.length; i++) {
			cells = "";
			for (var j=0; j<variables[i].data.length; j++) {
				temp = variables[i].data[j] === undefined ? "" : variables[i].data[j];
				cells += '<td>' + temp + '</td>';
			}
			infoTxt = variables[i].info == undefined ? "" : '<br/><span class="alert">' + variables[i].info + '</span>';
			pageText += '<tr><td>' + variables[i].name + '</td><td>' + variables[i].value + infoTxt + '</td>' + cells + '</tr>';
		}

		for (var i=0; i<variableErrors.length; i++) {
			cells = "";
			for (var j=0; j<variableErrors[i].data.length; j++) {
				temp = variableErrors[i].data[j] === undefined ? "" : variableErrors[i].data[j];
				cells += '<td>' + temp + '</td>';
			}
			pageText += '<tr style="background-color: LightGray;"><td>' + variableErrors[i].name + '</td><td>' + variableErrors[i].info + '</td>' + cells + '</tr>';
		}

		pageText += '</table></body></html>';

		window.open('','','width=300,height=450').document.write('<p style="font-family:sans-serif; font-size:12px">' + pageText + '</p>');
	},

	replaceVariables = function (tempText) {

		tempText = tempText.replace(
			new RegExp('\\[\\{(.*?)\\}(?:\\s|&nbsp;)*(?:(?:\\,(?:\\s|&nbsp;)*?(\\d+?)?))?\\]|<span class="x_var x_dyn_(.*?)">(?:.*?)</span>', 'g'),
			function (match, contents, round, id) {
				if (contents) {
					id = dynamicID++;
					dynamicCalcs[id] = [contents, round];
				}

				var result = variables.reduce(function(accumulator, variable) {
					return accumulator.replace(new RegExp('\\[' + variable.name + '\\]', 'g'), checkDecimalSeparator(variable.value));
				}, dynamicCalcs[id][0]);
				round = dynamicCalcs[id][1];

				try {
					var ev = eval( result );
					result = Math.round(
						ev * (round = Math.pow(10, round ? round  : 16))
					) / round;
				}
				catch (e) {}

				$('.x_dyn_' + id).html(checkDecimalSeparator(result));
				return '<span class="x_var x_dyn_' + id + '">' + result + '</span>';
			}
		);

		for (var k=0; k<variables.length; k++) {
			// if it's first attempt to replace vars on this page look at vars in image tags first
			// these are simply replaced with no surrounding tag so vars can be used as image sources etc.
			if (tempText.indexOf('[' + variables[k].name + ']') != -1) {
				var $tempText = $(tempText);
				for (var m=0; m<$tempText.find('img').length; m++){
					var tempImgTag = $tempText.find('img')[m].outerHTML,
						regExp2 = new RegExp('\\[' + variables[k].name + '\\]', 'g');
					tempImgTag = tempImgTag.replace(regExp2, checkDecimalSeparator(variables[k].value));
					$($tempText.find('img')[m]).replaceWith(tempImgTag);
				}
				tempText = $tempText.map(function(){ return this.outerHTML; }).get().join('');
			}

			// replace with the variable text (this looks at both original variable mark up (e.g. [a]) & the tag it's replaced with as it might be updating a variable value that's already been inserted)
			var regExp = new RegExp('\\[' + variables[k].name + '\\]|<span class="x_var x_var_' + variables[k].name + '">(.*?)</span>', 'g');
			tempText = tempText.replace(regExp, '<span class="x_var x_var_' + variables[k].name + '">' + checkDecimalSeparator(variables[k].value) + '</span>');

			// replace with a text input field which the end user can use to set the value of the variable
			regExp = new RegExp('\\[=' + variables[k].name + '\\]', 'g');
			tempText = tempText.replace(regExp, '<input type="text" name="' + variables[k].name + '" class="x_varInput">');

			// this format of the text input field has specified a default value
			regExp = new RegExp('\\[=' + variables[k].name + ':(.*?)\\]', 'g');

			var matches = tempText.match(regExp);
			if (matches != null) {
				for (var m=0; m<matches.length; m++) {
					tempText = tempText.replace(matches[m], '<input type="text" name="' + variables[k].name + '" class="x_varInput" placeholder="' + matches[m].substring(matches[m].indexOf(':')+1, matches[m].length-1) + '">');
				}
			}
		}

		// replace with a submit button which will submit all the new variable values entered on the page
		var submitBtnLabel = getLangInfo(languageData.find("submitBtnLabel")[0], "label", "Submit");
		var regExp = new RegExp('\\[\\+submit\\]', 'g');
		tempText = tempText.replace(regExp, '<input type="submit" value="' + submitBtnLabel + '" class="x_varSubmit">');

		// this format of the submit button has specified a default value
		regExp = new RegExp('\\[\\+submit:(.*?)\\]', 'g');

		var matches = tempText.match(regExp);
		if (matches != null) {
			for (var m=0; m<matches.length; m++) {
				tempText = tempText.replace(matches[m], '<input type="submit" value="' + matches[m].substring(matches[m].indexOf(':')+1, matches[m].length-1) + '" class="x_varSubmit">');
			}
		}

		return tempText;
	},

	handleSubmitButton = function () {
		// is there a submit button & at least one variable input?
		if ($('.x_varSubmit').length > 0 && $('.x_varInput').length > 0) {
			$('.x_varSubmit').click(function() {
				var dependants = [],
					changed = [],
					i, j, k;

				// update the variables changed via text fields
				for (i=0; i<$('.x_varInput').length; i++) {
					if ($('.x_varInput')[i].value != '') {
						changed.push($('.x_varInput')[i].name);
						var temp = setVariable($('.x_varInput')[i].name, $('.x_varInput')[i].value);
						if (temp.length > 0) {
							$.merge(dependants, temp);
						}
					}
				}

				// as well as updating any variables that have been directly changed there may be dependants of those variables to change too
				if (dependants.length > 0) {
					dependants = dependants.filter(function(a){if (!this[a]) {this[a] = 1; return a;}},{});

					for (i=0; i<dependants.length; i++) {
						for (j=0; j<variables.length; j++) {
							if (dependants[i] == variables[j].name) {
								for (k=0; k<variables[j].requiredBy.length; k++) {
									if ($.inArray(variables[j].requiredBy[k], dependants) == -1) {
										dependants.push(variables[j].requiredBy[k]);
									}
								}
							}
						}
					}

					var toCalc = [];
					for (i=0; i<variableInfo.length; i++) {
						if ($.inArray(variableInfo[i].name, dependants) > -1) {
							changed.push(variableInfo[i].name);
							toCalc.push(i);

							// clear current variable value
							for (k=0; k<variables.length; k++) {
								if (variableInfo[i].name == variables[k].name) {
									variables.splice(k,1);
									break;
								}
							}
						}
					}

					calcVariables(toCalc);
				}

				// should this page be immediately updated to show changes to the variable values?
				if ($(data).find('page').eq(currentPage).attr('varUpdate') != 'false') {
					for (i=0; i<variables.length; i++) {
						for (j=0; j<changed.length; j++) {
							if (variables[i].name == changed[j]) {
								$('.x_var_' + variables[i].name).html(checkDecimalSeparator(variables[i].value));
							}
						}
					}
				}

				// submit confirmation message
				if (changed.length > 0) {
					varsChanged = true;
					alert($(data).find('page').eq(currentPage).attr('varConfirm') != undefined && $(data).find('page').eq(currentPage).attr('varConfirm') != '' ? $(data).find('page').eq(currentPage).attr('varConfirm') : getLangInfo(languageData.find("submitConfirmMsg")[0], "label", "Your answers have been submitted"));
				}
			});
		}
	};

	// make some public methods
    self.init = init;
	self.exist = exist;
	self.handleSubmitButton = handleSubmitButton;
	self.replaceVariables = replaceVariables;
	self.showVariables = showVariables;
	self.updateVariable = updateVariable;

return parent; })(jQuery, XBOOTSTRAP || {});


// _____ GLOBAL VARIABLES _____
// allows surfacing of any global variables

var XBOOTSTRAP = (function ($, parent) { var self = parent.GLOBALVARS = {};

	var	replaceGlobalVars = function (tempText) {
		var regExp = new RegExp('\\{(.*?)\\}', 'g');

		var matches = tempText.match(regExp);
		if (matches != null) {
			for (var m=0; m<matches.length; m++) {
				try {
					tempText = tempText.replace(matches[m], '<span class="x_globalVar">' + eval(matches[m]) + '</span>');
				} catch (e){}
			}
		}

		return tempText;
	};

	// make some public methods
	self.replaceGlobalVars = replaceGlobalVars;

return parent; })(jQuery, XBOOTSTRAP || {});
