function Timeout(fn, interval) {
    var id = setTimeout(fn, interval);
    this.cleared = false;
    this.clear = function () {
        this.cleared = true;
        clearTimeout(id);
    };
}

function clearSelections() {
    if (window.getSelection)
    {
        window.getSelection().removeAllRanges();
    }
    else if (document.selection)
    {
        document.selection.empty();
    }
}

//credit to http://stackoverflow.com/a/21963136
var lut = []; for (var i=0; i<256; i++) { lut[i] = (i<16?'0':'')+(i).toString(16); }
function genUUID()
{
  var d0 = Math.random()*0xffffffff|0;
  var d1 = Math.random()*0xffffffff|0;
  var d2 = Math.random()*0xffffffff|0;
  var d3 = Math.random()*0xffffffff|0;
  return 'm-' + lut[d0&0xff]+lut[d0>>8&0xff]+lut[d0>>16&0xff]+lut[d0>>24&0xff]+'-'+
    lut[d1&0xff]+lut[d1>>8&0xff]+'-'+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+'-'+
    lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+'-'+lut[d2>>16&0xff]+lut[d2>>24&0xff]+
    lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff];
}


require(['meiEditor', 'https://x2js.googlecode.com/hg/xml2json.js', 'jquery.center.min'], function(){

(function ($)
{
    window.meiEditorPlugins.push((function()
    {
        var retval = 
            {
            divName: "diva-manager",
            title: 'Diva page manager',
            dropdownOptions: 
            {
                "Link files to Diva images...": "file-link-dropdown",
                "Unlink files from Diva images...": "file-unlink-dropdown",
                "Auto-link files by filename": "auto-link-dropdown",
                "Update Diva": "update-diva-dropdown",
                "Clear selection": "clear-selection-dropdown"
            },
            requiredSettings: ['divaInstance', 'jsonFileLocation'],
            init: function(meiEditor, meiEditorSettings)
            {
                if (!("divaInstance" in meiEditorSettings) || !("jsonFileLocation" in meiEditorSettings))
                {
                    console.error("MEI Editor error: The 'Diva Manager' plugin requires both the 'divaInstance' and 'jsonFileLocation' settings present on intialization.");
                    return false;
                }

                $.extend(meiEditorSettings, 
                {
                    divaPageList: [], //list of active pages in Diva
                    divaImagesToMeiFiles: {}, //keeps track of linked files
                    neumeObjects: {}, //keeps track of neume objects
                    curOverlayBox: "",
                    initDragTop: "",
                    initDragLeft: "",
                    dragActive: false,
                    editModeActive: false,
                    boxSingleTimeout: "",
                    boxClickHandler: "",
                    divaHoldX: "",
                    divaHoldY: "",
                    resizeTarget: "",
                    origDragInfo: {}
                });

                meiEditor.addToNavbar("Diva page manager", "diva-manager");
                $("#dropdown-diva-manager").append("<li><a id='file-link-dropdown'>Link files to Diva images...</a></li>");
                $("#dropdown-diva-manager").append("<li><a id='file-unlink-dropdown'>Unlink files from Diva images...</a></li>");
                $("#dropdown-diva-manager").append("<li><a id='auto-link-dropdown'>Auto-link files by filename</a></li>");
                $("#dropdown-diva-manager").append("<li><a id='update-diva-dropdown'>Update Diva</a></li>");
                $("#dropdown-diva-manager").append("<li><a id='clear-selection-dropdown'>Clear selection</a></li>");
                $("#help-dropdown").append("<li><a id='diva-manager-help'>Diva page manager</a></li>");

                $("#file-link-dropdown").on('click', function()
                {
                    $('#fileLinkModal').modal();
                });

                $("#file-unlink-dropdown").on('click', function()
                {
                    $('#fileUnlinkModal').modal();
                });

                $("#auto-link-dropdown").on('click', function()
                {
                    meiEditor.autoLinkFiles();
                });

                $("#update-diva-dropdown").on('click', function()
                {
                    meiEditor.createHighlights();
                });

                $("#clear-selection-dropdown").on('click', function()
                {
                    meiEditor.deselectAllHighlights();
                });

                $("#diva-manager-help").on('click', function()
                {
                    $("#divaHelpModal").modal();
                });

                createModal(meiEditorSettings.element, "fileLinkModal", false, 
                    "<span class='modalSubLeft'>" +
                    "Select an MEI file:<br>" +
                    createSelect("file-link", meiEditorSettings.pageData) +
                    "</span>" +
                    "<span class='modalSubRight'>" +
                    "Select a Diva image:<br>" + 
                    createSelect("diva-link", meiEditorSettings.divaPageList, true) + 
                    "</span>" + 
                    "<div class='clear'></div>" + 
                    "<div class='centeredAccept'>" + 
                    "<button id='link-files'>Link selected files</button>" + 
                    "</div>");

                createModal(meiEditorSettings.element, "fileUnlinkModal", false, 
                    "<div id='unlink-wrapper'>" + 
                    "Unlink an MEI file from a Diva file:<br>" + 
                    "<select id='selectUnlink'></select><br>" + 
                    "<button id='unlink-files'>Unlink selected files</button>" + 
                    "</div>");

                createModal(meiEditorSettings.element, "divaHelpModal", false,
                    "<h4>Help for 'Diva Page Manager' menu:</h4>" + 
                    "<li>To get highlights from a file to show up in the Diva pane, click 'Link files to Diva images...' from the dropdown menu and select the files you want to link.</li>" + 
                    "<br><li>'Auto-link files by filename' will automatically strip file extensions and try to match files so that '001.mei' and '001.tiff' become linked.</li>" + 
                    "<br><li>Changes you make to the MEI document will not automatically transfer over; click 'Update Diva' to reload the highlighted objects in the image viewer.</li>" + 
                    "<br><li>Clicking on a highlight then clicking on another will unselect the first one; to select multiple, hold shift and drag to select every highlight within a box or hold shift and click multiple highlights to select them all.</li>" + 
                    "<br><li>To deselect a single highlight, shift+click on the highlight.</li>" +
                    "<br><li>To deselect all highlights, choose the 'Clear selection' option of this dropdown.</li>" + 
                    "<br><li>To create a new highlight, shift+click on empty space on the image.</li>" +
                    "<br><li>Press the 'delete' key on your keyboard to delete all selected highlights and the MEI lines associated with them.</li>");

                //the div that pops up when highlights are hovered over
                meiEditorSettings.element.append('<span id="hover-div"></span>'); 

                //changes the position of the on-hover box
                var changeHoverPosition = function(e)
                {
                    $("#hover-div").offset(
                    {
                        'top': e.pageY - 10,
                        'left': e.pageX + 10
                    });
                };

                //detects whether or not a keypress was the escape key and triggers
                var detectEscape = function(ev)
                {
                    if (ev.keyCode == 27) 
                    { 
                        meiEditor.deselectResizable(".resizableSelected");
                    } 
                };    

                /*
                    Function called when sections are rehighlighted to refresh the listeners.
                */
                var reapplyBoxListeners = function()
                {
                    unbindBoxListeners();

                    $(".overlay-box").hover(function(e) //when the hover starts for an overlay-box
                    {
                        //if there is a box currently being drawn, don't do anything
                        if (meiEditorSettings.dragActive === true)
                        {
                            return;
                        }

                        currentTarget = e.target.id;

                        $("#hover-div").html(meiEditorSettings.neumeObjects[currentTarget] + "<br>Click to find in document.");
                        $("#hover-div").css(//create a div with the name of the hovered neume
                        {
                            'height': 'auto',
                            'top': e.pageY - 10,
                            'left': e.pageX + 10,
                            'padding-left': '10px',
                            'padding-right': '10px',
                            'border': 'thin black solid',
                            'background': '#FFFFFF',
                            'display': 'block',
                            'vertical-align': 'middle'
                        });

                        //if this isn't selected, change the color 
                        if (!$("#" + currentTarget).hasClass('selectedHover'))
                        {
                            $("#"+currentTarget).css('background-color', 'rgba(255, 255, 255, 0.05)');
                        }

                        //needs to be separate function as we have separate document.mousemoves that need to be unbound separately
                        $(document).on('mousemove', changeHoverPosition);
                    }, function(e)
                    {
                        currentTarget = e.target.id;
                        $(document).unbind('mousemove', changeHoverPosition); //stops moving the div
                        $("#hover-div").css('display', 'none'); //hides the div
                        $("#hover-div").html("");

                        //if this isn't selected, change the color back to normal
                        if(!$("#" + currentTarget).hasClass('selectedHover'))
                        {
                            $("#" + currentTarget).css('background-color', 'rgba(255, 0, 0, 0.2)');
                        }
                    });

                    $(".overlay-box").click(function(e)
                    {
                        e.preventDefault();
                        e.stopPropagation();

                        /*
                        no matter what, clear the old one. 
                            -in the case of a double-click, this'll clear the first
                            -in the case of a single, this will clear the old before it's set.
                            -regardless, this will clear the old one; reclearing an old one is not harmful
                        */
                        clearTimeout(meiEditorSettings.boxSingleTimeout);

                        meiEditorSettings.boxSingleTimeout = setTimeout(function()
                        {
                            //different function depending on whether or not shift is down; needs the wrapper to get event info
                            meiEditorSettings.boxClickHandler(e);
                        }, 300);
                    });

                    //on doubleclick, move this specific div into resizable mode
                    $(".overlay-box").dblclick(function(e)
                    {
                        clearTimeout(meiEditorSettings.boxSingleTimeout);
                        e.preventDefault();
                        e.stopPropagation();

                        //turn off scrollability and put the overlay down
                        meiEditorSettings.divaInstance.disableScrollable();
                        $("#diva-wrapper").append("<div id='lineQueryOverlay'></div>");
                        $("#lineQueryOverlay").offset({'top': $("#diva-wrapper").offset().top, 'left': $("#diva-wrapper").offset().left});
                        $("#lineQueryOverlay").width($("#diva-wrapper").width());
                        $("#lineQueryOverlay").height($("#diva-wrapper").height());

                        origObject = e.target;           
                        $("#hover-div").css('display', 'none'); //hides the div
                        $("#hover-div").html("");
                        unbindBoxListeners();

                        meiEditor.selectResizable(origObject);
                    });
                }; 

                //unbinds listeners from above function
                var unbindBoxListeners = function()
                {
                    $(".overlay-box").unbind('hover');
                    $(".overlay-box").unbind('click');
                    $(".overlay-box").unbind('dblclick');
                    $(document).unbind('keyup', detectEscape);
                    $(".overlay-box").unbind('mouseenter');
                    $(document).unbind('mousemove', changeHoverPosition); //stops moving the div
                    $(".overlay-box").unbind('mouseleave');
                };    

                //writes changes to an object into the document
                meiEditor.updateBox = function(box)
                {
                    var boxPosition = $(box).position();
                    var boxID = $(box).attr('id');
                    var ulx = meiEditorSettings.divaInstance.translateToMaxZoomLevel(boxPosition.left);
                    var uly = meiEditorSettings.divaInstance.translateToMaxZoomLevel(boxPosition.top);
                    var lrx = meiEditorSettings.divaInstance.translateToMaxZoomLevel(ulx + $(box).outerWidth());
                    var lry = meiEditorSettings.divaInstance.translateToMaxZoomLevel(uly + $(box).outerHeight());

                    //search to get the line number where the zone object is
                    var searchNeedle = new RegExp("<zone.*" + $(box).attr('id'), "g");
                    var pageTitle = meiEditor.getActivePanel().text();
                    var searchRange = meiEditorSettings.pageData[pageTitle].find(searchNeedle, 
                    {
                        wrap: true,
                        range: null
                    });

                    //get the text of that line, removing the whitespace at the beginning
                    var line = meiEditorSettings.pageData[pageTitle].session.doc.getLine(searchRange.start.row).trim();
                   

                    //replace all four sides
                    line = line.replace(/ulx="[0-9]+"/, 'ulx="' + ulx + '"');
                    line = line.replace(/uly="[0-9]+"/, 'uly="' + uly + '"');
                    line = line.replace(/lrx="[0-9]+"/, 'lrx="' + lrx + '"');
                    line = line.replace(/lry="[0-9]+"/, 'lry="' + lry + '"');

                    //get the new line length
                    searchRange.end.column = line.length + 100;

                    //keep the whitespace intact at the beginning
                    meiEditorSettings.pageData[pageTitle].session.doc.replace(searchRange, line);

                    //regenerate the highlights, reset the listeners, reselect the same box
                    meiEditor.createHighlights();
                    unbindBoxListeners();
                    meiEditor.selectResizable("#" + boxID);
                };

                /*
                    Creates highlights based on the ACE documents.
                */
                meiEditor.createHighlights = function()
                {   

                    meiEditorSettings.neumeObjects = {};
                    var x2js = new X2JS(); //from xml2json.js
                    meiEditorSettings.divaInstance.resetHighlights();
                    for (curKey in meiEditorSettings.divaImagesToMeiFiles)
                    { //for each page
                        var pageName = meiEditorSettings.divaImagesToMeiFiles[curKey];
                        pageIndex = meiEditorSettings.divaPageList.indexOf(curKey);
                        pageText = meiEditorSettings.pageData[pageName].getSession().doc.getAllLines().join("\n"); //get the information from the page expressed in one string
                        jsonData = x2js.xml_str2json(pageText); //turn this into a JSON "dict"
                        regions = [];

                        xmlns = jsonData['mei']['_xmlns']; //find the xml namespace file
                        var neume_ulx, neume_uly, neume_width, neume_height;
                        neumeArray = jsonData['mei']['music']['body']['neume'];
                        facsArray = jsonData['mei']['music']['facsimile']['surface']['zone'];
                        for (curZoneIndex in facsArray) //for each "zone" object
                        { 
                            curZone = facsArray[curZoneIndex];
                            neumeID = curZone._neume;
                            for (curNeumeIndex in neumeArray) //find the corresponding neume - don't think there's a more elegant way in JS
                            { 
                                if (neumeArray[curNeumeIndex]["_xml:id"] == neumeID)
                                {
                                    curNeume = neumeArray[curNeumeIndex]; //assemble the info on the neume
                                    meiEditorSettings.neumeObjects[neumeID] = curNeume['_name'];
                                    neume_ulx = curZone._ulx;
                                    neume_uly = curZone._uly;
                                    neume_width = curZone._lrx - neume_ulx;
                                    neume_height = curZone._lry - neume_uly;
                                    break;
                                }
                            }
                            //add it to regions
                            regions.push({'width': neume_width, 'height': neume_height, 'ulx': neume_ulx, 'uly': neume_uly, 'divID': neumeID});
                        }
                        //at the end of each page, call the highlights
                        meiEditorSettings.divaInstance.highlightOnPage(pageIndex, regions, undefined, "overlay-box", reapplyBoxListeners);
                    }
                };

                //function to make a div resizable
                meiEditor.selectResizable = function(object)
                {
                    //change color to yellow, pop on top of everything
                    $(object).css({'z-index': 150,
                        'background-color': 'rgba(255, 255, 0, 0.5)'});
                    $(object).addClass('resizableSelected');

                    //jQuery UI draggable, when drag stops update the box's position in the document
                    console.log(object);
                    $(object).resizable({
                        handles: 'all',
                        start: function(e)
                        {
                            e.stopPropagation();
                            e.preventDefault();
                        },
                        resize: function(e)
                        {
                            e.stopPropagation();
                            e.preventDefault();
                        },
                        stop: function(e, ui)
                        {
                            e.stopPropagation();
                            e.preventDefault();
                            meiEditor.updateBox(ui.helper);
                        }
                    }).draggable({
                        stop: function(e, ui)
                        {
                            meiEditor.updateBox(ui.helper);
                        }
                    //jQueryUI resizable, same as above
                    });

                    //this prevents a graphical glitch with Diva
                    $("#diva-wrapper").on('resize', function(e){
                        e.stopPropagation();
                        e.preventDefault();
                    });

                    //escape gets you out of this
                    $(document).keyup(detectEscape);
                };

                //deselects a resizable object
                meiEditor.deselectResizable = function(object)
                {
                    console.log(object);
                    $(object).draggable('destroy');
                    $(object).resizable('destroy');
                    $(object).css('z-index', $(".overlay-box").css('z-index'));
                    $(object).css('background-color', 'rgba(255, 0, 0, 0.2)');
                    $("#lineQueryOverlay").remove();
                    meiEditorSettings.divaInstance.enableScrollable();
                    reapplyBoxListeners();
                    $("#diva-wrapper").unbind('resize');
                };

                meiEditor.selectHighlight = function(divToSelect)
                {
                    //if this is the first click, find the <neume> object
                    var searchNeedle = new RegExp("<neume.*" + divToSelect.id, "g");

                    var pageTitle = meiEditor.getActivePanel().text();
                    var testSearch = meiEditorSettings.pageData[pageTitle].find(searchNeedle, 
                    {
                        wrap: true,
                        range: null
                    });
                    $(divToSelect).addClass('selectedHover');
                    $(divToSelect).css('background-color', 'background-color:rgba(0, 255, 0, 0.1)');
                };

                meiEditor.deselectAllHighlights = function()
                {
                    $(".selectedHover").css('background-color', 'rgba(255, 0, 0, 0.2)');
                    $(".selectedHover").toggleClass("selectedHover");
                };

                meiEditor.deselectHighlight = function(divToDeselect)
                {
                    $(divToDeselect).css('background-color', 'rgba(255, 0, 0, 0.2)');
                    $(divToDeselect).toggleClass("selectedHover");
                };

                /*
                    Automatically links all MEI files and Diva files by snipping off file extensions and finding matches.
                */

                meiEditor.autoLinkFiles = function()
                {
                    var linkedArr = [];
                    //for each ordered page
                    for (curMei in meiEditorSettings.pageData)
                    {
                        //get the extension; if one doesn't exist, skip this file. if page is already linked, skip.
                        if (typeof(curMei.split(".")[1]) == "undefined" || meiEditor.meiIsLinked(curMei))
                        {
                            continue;
                        }
                        var meiExtLength = curMei.split(".")[1].length + 1;

                        //for each diva image
                        for (curDivaIndex in meiEditorSettings.divaPageList)
                        {
                            //same
                            var curDivaFile = meiEditorSettings.divaPageList[curDivaIndex];
                            var divaExtLength = curDivaFile.split(".")[1].length + 1;

                            //if the two filenames are equal
                            if (curMei.slice(0, -(meiExtLength)) == curDivaFile.slice(0, -(divaExtLength)))
                            {
                                //grab the option elements that we eventually need to hide by searching for the filename in the $(object) select object
                                var meiOption = $("#selectfile-link").find(':contains("' + curMei + '")');
                                var imageOption = $("#selectdiva-link").find(':contains("' + curDivaFile + '")');

                                //link 'em, and we found it so break
                                meiEditor.linkMeiToDiva(meiOption, imageOption);
                                linkedArr.push(curMei);
                                break;
                            }
                        }
                    }

                    if (linkedArr.length === 0)
                    {
                        meiEditor.localWarn("Nothing to link.");
                    }
                    else 
                    {
                        meiEditor.localLog("Linked " + linkedArr.length + " of " + Object.keys(meiEditorSettings.pageData).length + " total MEI files. (" + linkedArr.join(', ') + ")");
                        meiEditor.createHighlights();
                    }
                };

                /*
                    Determines if a mei file is linked to an image.
                    @param meiFile the mei file to check
                */
                meiEditor.meiIsLinked = function(meiFile)
                {
                    for (curDivaFile in meiEditorSettings.divaImagesToMeiFiles)
                    {
                        if (meiFile == meiEditorSettings.divaImagesToMeiFiles[curDivaFile])
                        {
                            return curDivaFile;
                        }
                    }
                    return false;
                };

                /* 
                    Function that links an mei file to a diva image.
                    @param selectedMEI The MEI page to link
                    @param selectedImage The image to link.
                */
                
                meiEditor.linkMeiToDiva = function(selectedMei, selectedImage)
                {
                    //prep variables
                    var selectedMeiText = selectedMei.text();
                    var selectedImageText = selectedImage.text();
                    var selectedStrippedMEI = selectedMeiText.replace(/\W+/g, "");
                    var selectedStrippedImage = selectedImageText.replace(/\W+/g, "");

                    //make the link
                    meiEditorSettings.divaImagesToMeiFiles[selectedImageText] = selectedMeiText;

                    //make the option object
                    $("#selectUnlink").append("<option>" + selectedMeiText + " and " + selectedImageText + "</option>");

                    //byebye
                    $(selectedMei).remove();
                    $(selectedImage).remove();
                };
                /*
                    This is a separate function as it's used in two locations.
                */
                meiEditor.reapplyEditorClickListener = function()
                {
                    $(".aceEditorPane").on('click', function()
                    {
                        var activeTab = meiEditor.getActivePanel().text();
                        if (meiEditor.meiIsLinked(activeTab))
                        {
                            var row = meiEditorSettings.pageData[activeTab].getCursorPosition().row;
                            var rowText = meiEditorSettings.pageData[activeTab].session.doc.getLine(row);
                            var matchArr = rowText.match(/m-[(0-9|a-f)]{8}(-[(0-9|a-f)]{4}){3}-[(0-9|a-f)]{12}/g);
                            var curMatch = matchArr.length;
                            while (curMatch--)
                            {
                                if ($("#"+matchArr[curMatch]).length)
                                {
                                    meiEditor.selectHighlight($("#"+matchArr[curMatch]));
                                }
                            }
                        }
                    });
                };

                $.ajax( //this grabs the json file to get an meiEditor-local list of the image filepaths
                {
                    url: meiEditorSettings.jsonFileLocation,
                    cache: true,
                    dataType: 'json',
                    success: function (data, status, jqxhr)
                    {
                        for (curPage in data.pgs)
                        {
                            fileNameOriginal = data.pgs[curPage].f; //original file name
                            fileNameStripped = fileNameOriginal.replace(/\W+/g, ""); //used for jQuery selectors as they can't handle periods easily
                            meiEditorSettings.divaPageList.push(fileNameOriginal);
                            $("#selectdiva-link").append("<option name='"+fileNameOriginal+"'>" + fileNameOriginal + "</option>");
                        }
                    }
                });

                //when the page changes, make the editor reflect that
                diva.Events.subscribe("VisiblePageDidChange", function(pageNumber, fileName)
                {
                    //only if it's linked
                    if (fileName in meiEditorSettings.divaImagesToMeiFiles)
                    {
                        var activeFileName = meiEditorSettings.divaImagesToMeiFiles[fileName];
                        var tabArr = $("#pagesList > li > a");
                        for (curTabIndex in tabArr)
                        {
                            var curTab = tabArr[curTabIndex];
                            if ($(curTab).text() == activeFileName)
                            {
                                $("#openPages").tabs("option", "active", curTabIndex);
                                return;
                            }
                        }
                    }
                });

                meiEditor.events.subscribe("NewFile", function(a, fileName)
                {
                    $("#selectfile-link").append("<option name='" + fileName + "'>" + fileName + "</option>");
                    meiEditor.reapplyEditorClickListener();
                });

                meiEditor.events.subscribe("PageEdited", meiEditor.createHighlights);

                meiEditor.events.subscribe("PageWasDeleted", function(pageName)
                {
                    var retVal = meiEditor.meiIsLinked(pageName);
                    if (retVal)
                    {
                        delete meiEditorSettings.divaImagesToMeiFiles[retVal];
                    }
                });
                //to get default pages
                meiEditor.reapplyEditorClickListener();

                //when "Link selected files" is clicked
                $("#link-files").on('click', function()
                {
                    //grab the IDs/stripped IDs of the linked files
                    var selectedMEI = $('#selectfile-link').find(':selected');
                    var selectedImage = $('#selectdiva-link').find(':selected');

                    //if there's not 2 selected files, "throw" an error
                    if (selectedMEI === undefined || selectedImage === undefined)
                    {
                        meiEditor.localError("Please make sure that an MEI file and an image are selected.");
                        return;
                    } 
                    else 
                    {
                        meiEditor.localLog("Successfully linked " + selectedMEI.text() + " to " + selectedImage.text() + ".");
                    }

                    meiEditor.linkMeiToDiva(selectedMEI, selectedImage);

                    //because one line of code helps prevent one pound of laziness; this is here so that autoLink doesn't call it
                    meiEditor.createHighlights();
                });

                $("#unlink-files").on('click', function()
                {
                    var selectedPair = $('#selectUnlink').find(':selected');
                    var fileArr = selectedPair.text().split(' and ');

                    //change the data/DOM
                    delete meiEditorSettings.divaImagesToMeiFiles[fileArr[1]];
                    $("#selectfile-link").append("<option name='" + fileArr[0] + "'>" + fileArr[0] + "</option>");
                    $("#selectdiva-link").append("<option name='" + fileArr[1] + "'>" + fileArr[1] + "</option>");
                    $(selectedPair).remove();

                    meiEditor.localLog("Successfully unlinked " + fileArr[0] + " from " + fileArr[1] + ".");

                    //reload highlights
                    meiEditor.createHighlights();

                });

                $(document).on('keydown', function(e)
                {
                    if(e.shiftKey)
                    {
                        /*
                            Click handler for when the shift key is down and a box is clicked
                        */
                        meiEditorSettings.boxClickHandler = function(e)
                        {
                            clearTimeout(meiEditorSettings.boxSingleTimeout);
                            //if shift key is not down, turn off all other .selectedHover items
                            if ($(e.target).hasClass('selectedHover'))
                            {
                                meiEditor.deselectHighlight(e.target);
                                return;
                            }
                            else
                            {
                                //add class and change the background color
                                meiEditor.selectHighlight(e.target);
                            }
                        };

                        meiEditorSettings.editModeActive = true;
                        $("#editorConsole").append('<div id="cover-div"></div>');
                        $("#cover-div").height($("#diva-wrapper").height());
                        $("#cover-div").width($("#diva-wrapper").width());
                        //if .overlay-box is not created yet, we want this to be NaN so it can't be clicked on.
                        $("#cover-div").css('z-index', $(".overlay-box").css('z-index') - 1);
                        $("#cover-div").offset({'top': $("#diva-wrapper").offset().top, 'left': $("#diva-wrapper").offset().left});

                        $("#cover-div").on('mousedown', function(ev)
                        {
                            var changeDragSize = function(eve)
                            {
                                clearSelections();

                                //original four sides
                                var dragLeft = $("#drag-div").offset().left;
                                var dragTop = $("#drag-div").offset().top;
                                var dragRight = dragLeft + $("#drag-div").width();
                                var dragBottom = dragTop + $("#drag-div").height();           

                                //if we're moving left
                                if (ev.pageX < meiEditorSettings.initDragLeft)
                                {
                                    $("#drag-div").offset({'left': eve.pageX});
                                    $("#drag-div").width(dragRight - eve.pageX);
                                }
                                //moving right
                                else 
                                {   
                                    $("#drag-div").width(eve.pageX - dragLeft);
                                }
                                //moving up
                                if (ev.pageY < meiEditorSettings.initDragTop)
                                {
                                    $("#drag-div").offset({'top': eve.pageY});
                                    $("#drag-div").height(dragBottom - eve.pageY);
                                }
                                //moving down
                                else 
                                {
                                    $("#drag-div").height(eve.pageY - dragTop);
                                }
                            };
                            //append the div that will resize as you drag
                            $("#topbar").append('<div id="drag-div"></div>');
                            $("#drag-div").css('z-index', $(".overlay-box").css('z-index') + 1);
                            meiEditorSettings.initDragTop = ev.pageY;
                            meiEditorSettings.initDragLeft = ev.pageX;
                            meiEditorSettings.dragActive = true;
                            $("#drag-div").offset({'top': ev.pageY, 'left':ev.pageX});

                            //as you drag, resize it - separate function as we have two document.mousemoves that we need to unbind separately
                            $(document).on('mousemove', changeDragSize);

                            $(document).on('mouseup', function(eve)
                            {
                                $(document).unbind('mousemove', changeDragSize);
                                $(document).unbind('mouseup');

                                //if this was just a click
                                if ($("#drag-div").width() < 2 && $("#drag-div").height() < 2)
                                {
                                    if (meiEditorSettings.curOverlayBox === '')
                                    {
                                        //get the click
                                        var centerX = eve.pageX;
                                        var centerY = eve.pageY;

                                        var divaInnerObj = $("#1-diva-page-" + meiEditorSettings.divaInstance.getCurrentPageIndex());
                                        centerY = meiEditorSettings.divaInstance.translateToMaxZoomLevel(centerY - divaInnerObj.offset().top);
                                        centerX = meiEditorSettings.divaInstance.translateToMaxZoomLevel(centerX - divaInnerObj.offset().left);

                                        //make a 200*200 box
                                        var newBoxLeft = centerX - 100;
                                        var newBoxRight = centerX + 100;
                                        var newBoxTop = centerY - 100;
                                        var newBoxBottom = centerY + 100;

                                        //generate some UUIDs
                                        var zoneID = genUUID();
                                        var neumeID = genUUID();

                                        //generate the element strings
                                        var zoneStringToAdd = '<zone xml:id="' + zoneID + '" neume="' + neumeID + '" ulx="' + newBoxLeft + '" uly="' + newBoxTop + '" lrx="' + newBoxRight + '" lry="' + newBoxBottom + '" />';
                                        var neumeStringToAdd = '<neume xml:id="' + neumeID + '" name="neume.por" />';

                                        //create the fake modal
                                        $("#diva-wrapper").append("<div id='lineQueryOverlay'></div>");
                                        $("#lineQueryOverlay").offset({'top': $("#diva-wrapper").offset().top, 'left': $("#diva-wrapper").offset().left});
                                        $("#lineQueryOverlay").width($("#diva-wrapper").width());
                                        $("#lineQueryOverlay").height($("#diva-wrapper").height());

                                        //create the contents of the modal
                                        $("#lineQueryOverlay").append("<div id='lineQuery'>" +
                                            "<h4>Enter desired line numbers for the zone and neume objects:</h4>" +
                                            "Zone line number: <input type='text' id='zoneLineInput'><br>" +
                                            "Neume line number: <input type='text' id='neumeLineInput'><br>" +
                                            "<button style='float:right' type='button' class='btn btn-default' id='lineQueryClose'>Close</button>" +
                                            "<button style='float:right' type='button' class='btn btn-primary' id='lineQuerySubmit'>Create Highlight</button>" +
                                            "</div>");

                                        $("#lineQuery").center({against: 'parent'});

                                        //function to insert a new neume, takes the document filename as input
                                        var insertNewNeume = function(chosenDoc)
                                        {                          
                                            var lineCount = meiEditorSettings.pageData[chosenDoc].getSession().doc.getLength();
                                            var zoneStringLine = parseInt($("#zoneLineInput").val(), 10);
                                            var neumeStringLine = parseInt($("#neumeLineInput").val(), 10);

                                            //if the line number is not an int and inside the line count for the current page, throw an error
                                            if((zoneStringLine < 1) || (zoneStringLine > lineCount) || !(zoneStringLine))
                                            {
                                                meiEditor.localError("Please enter a number between 1 and " + lineCount + " for the zone line.");
                                                return;
                                            }
                                            if((neumeStringLine < 1) || (neumeStringLine > lineCount) || !(neumeStringLine))
                                            {
                                                meiEditor.localError("Please enter a number between 1 and " + lineCount + " for the neume line.");
                                                return;
                                            }

                                            $("#lineQueryClose").trigger('click');

                                            //add to the document
                                            var zoneWhiteSpace = meiEditorSettings.pageData[chosenDoc].session.doc.getLine(zoneStringLine).split("<")[0];
                                            var neumeWhiteSpace = meiEditorSettings.pageData[chosenDoc].session.doc.getLine(neumeStringLine).split("<")[0];
                                            meiEditorSettings.pageData[chosenDoc].session.doc.insertLines(zoneStringLine, [zoneWhiteSpace + zoneStringToAdd]);
                                            meiEditorSettings.pageData[chosenDoc].session.doc.insertLines(neumeStringLine, [neumeWhiteSpace + neumeStringToAdd]);

                                            //redraw highlights
                                            meiEditor.createHighlights();
                                        };

                                        //on close for the overlay
                                        $("#lineQueryClose").on('click', function()
                                        {
                                            $("#lineQueryOverlay").remove();
                                        });

                                        //on submit for the overlay
                                        $("#lineQuerySubmit").on('click', function()
                                        {
                                            insertNewNeume(meiEditor.getActivePanel().text());
                                        });
                                    }
                                }
                                else 
                                {
                                    //there's gotta be something simpler than this, but I can't find it for the life of me.
                                    //get the four sides
                                    var boxLeft = $("#drag-div").offset().left;
                                    var boxRight = boxLeft + $("#drag-div").width();
                                    var boxTop = $("#drag-div").offset().top;
                                    var boxBottom = boxTop + $("#drag-div").height();

                                    //for each overlay-box
                                    var curBoxIndex = $(".overlay-box").length;
                                    while (curBoxIndex--)
                                    {
                                        var curBox = $(".overlay-box")[curBoxIndex];

                                        //see if any part of the box is inside (doesn't have to be the entire box)
                                        var curLeft = $(curBox).offset().left;
                                        var curRight = curLeft + $(curBox).width();
                                        var curTop = $(curBox).offset().top;
                                        var curBottom = curTop + $(curBox).height();
                                        if (curRight < boxLeft)
                                            continue;
                                        else if (curLeft > boxRight)
                                            continue;
                                        else if (curBottom < boxTop)
                                            continue;
                                        else if (curTop > boxBottom)
                                            continue;

                                        //if we're still here, select it
                                        if(!($(curBox).hasClass('selectedHover')))
                                        {
                                            meiEditor.selectHighlight(curBox);
                                        }
                                    }
                                }

                                $("#drag-div").remove();
                                meiEditorSettings.dragActive = false;
                            });
                        });

                        
                    }
                });

                $(document).on('keyup', function(e)
                {
                    //if it was the shift key that was released
                    if((!e.shiftKey) && meiEditorSettings.editModeActive)
                    {  
                        meiEditorSettings.boxClickHandler = function(e)
                        {
                            clearTimeout(meiEditorSettings.boxSingleTimeout);
                            
                            //if shift key is not down, turn off all other .selectedHover items
                            meiEditor.deselectAllHighlights(e.target);

                            if (!$(e.target).hasClass('selectedHover'))
                            {
                                //if this is the first click, find the <neume> object
                                var searchNeedle = new RegExp("<neume.*" + e.target.id, "g");

                                var pageTitle = meiEditor.getActivePanel().text();
                                var testSearch = meiEditorSettings.pageData[pageTitle].find(searchNeedle, 
                                {
                                    wrap: true,
                                    range: null
                                });

                                //add class and change the background color
                                meiEditor.selectHighlight(e.target);
                            }
                        };

                        meiEditorSettings.editModeActive = false;
                        $("#cover-div").unbind('dblclick');
                        $("#cover-div").unbind('mousedown');
                        $("#cover-div").remove();
                    }

                });
                
                //easy mode to set a listener for clicking on icons
                meiEditorSettings.editModeActive = true;
                $(document).trigger('keyup');

                return true;
            }
        };
        return retval;
    })());
    window.pluginLoader.pluginLoaded();
})(jQuery);

});