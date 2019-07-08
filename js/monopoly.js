var Monopoly = {};
Monopoly.allowRoll = true;
Monopoly.moneyAtStart = 100;
Monopoly.doubleCounter = 0;

//initial the game after the DOM is loading
Monopoly.init = function () {
    $(document).ready(function () {
        Monopoly.adjustBoardSize();
        $(window).bind("resize", Monopoly.adjustBoardSize);
        Monopoly.initDice();
        Monopoly.initPopups();
        Monopoly.start();
    });
};

//start pop up message
Monopoly.start = function () {
    Monopoly.showPopup("intro")
};

//rolling dice
Monopoly.initDice = function () {
    $(".dice").click(function () {
        if (Monopoly.allowRoll) {
            Monopoly.rollDice();
        }
    });
};

//fun that return the current player
Monopoly.getCurrentPlayer = function () {
    return $(".player.current-turn");
};

Monopoly.getPlayersCell = function (player) {
    return player.closest(".cell");
};

Monopoly.getPlayersMoney = function (player) {
    return parseInt(player.attr("data-money"));
};

Monopoly.updatePlayersMoney = function (player, amount) {
    var playersMoney = parseInt(player.attr("data-money"));
    playersMoney -= amount;
    if (playersMoney < 0) {
        var popup = Monopoly.getPopup("broke");
        popup.find("button").unbind("click").bind("click", Monopoly.closePopup);
        Monopoly.showPopup("broke");
        Monopoly.removePlayer(player);
    }
    player.attr("data-money", playersMoney);
    player.attr("title", player.attr("id") + ": $" + playersMoney);
    Monopoly.playSound("chaching");
};

Monopoly.removePlayer = function (player) {
    player.addClass("broke");
    var playerId = player.attr("id");
    var numCellsOfPlayer = $("." + playerId);
    console.log(numCellsOfPlayer.length);
    if (numCellsOfPlayer.length > 0) {
        for (var i = 0; i < numCellsOfPlayer.length; i++) {
            numCellsOfPlayer[i].classList.add("available");
            numCellsOfPlayer[i].classList.remove(playerId);
            numCellsOfPlayer[i].removeAttribute("data-owner");
            numCellsOfPlayer[i].removeAttribute("data-rent");
        }
    }
}

//rolls the dice
Monopoly.rollDice = function () {
    var result1 = Math.floor(Math.random() * 6) + 1;
    var result2 = Math.floor(Math.random() * 6) + 1;
    $(".dice").find(".dice-dot").css("opacity", 0);
    $(".dice#dice1").attr("data-num", result1).find(".dice-dot.num" + result1).css("opacity", 1);
    $(".dice#dice2").attr("data-num", result2).find(".dice-dot.num" + result2).css("opacity", 1);
    if (result1 === result2) {
        Monopoly.doubleCounter++;
    } else {
        Monopoly.doubleCounter = 0;
    }
    var currentPlayer = Monopoly.getCurrentPlayer();
    Monopoly.handleAction(currentPlayer, "move", result1 + result2);
};

Monopoly.movePlayer = function (player, steps) {
    Monopoly.allowRoll = false;
    var playerMovementInterval = setInterval(function () {
        if (steps == 0) {
            clearInterval(playerMovementInterval);
            Monopoly.handleTurn(player);
        } else {
            var playerCell = Monopoly.getPlayersCell(player);
            var nextCell = Monopoly.getNextCell(playerCell);
            nextCell.find(".content").append(player);
            steps--;
        }
    }, 200);
};

Monopoly.handleTurn = function () {
    var player = Monopoly.getCurrentPlayer();
    var playerCell = Monopoly.getPlayersCell(player);
    if (Monopoly.doubleCounter === 3) {             // player goes to jail if he gets 3 doubles in a row
        Monopoly.handleGoToJail(player);
    } else if (playerCell.attr("data-owner") !== player.attr("id") && player.hasClass("owner")
        && typeof playerCell.attr("data-owner") !== undefined) {
        Monopoly.handlePlayerNotOwner(player);
    } else if (playerCell.is(".available.property")) {
        Monopoly.handleBuyProperty(player, playerCell);
    } else if (playerCell.is(".property:not(.available)") && !playerCell.hasClass(player.attr("id"))) {
        Monopoly.handlePayRent(player, playerCell);
    } else if (playerCell.is(".go-to-jail")) {
        Monopoly.handleGoToJail(player);
    } else if (playerCell.is(".chance")) {
        Monopoly.handleChanceCard(player);
    } else if (playerCell.is(".community")) {
        Monopoly.handleCommunityCard(player);
    } else if (playerCell.attr("data-owner") === player.attr("id")) {
        Monopoly.handlePlayerIsOwner(player);
    } else {
        Monopoly.setNextPlayerTurn();
    }
}

Monopoly.handlePlayerIsOwner = function (player) {
    player.addClass("owner");
    Monopoly.setNextPlayerTurn();
};

Monopoly.handlePlayerNotOwner = function (player) {
    player.removeClass("owner");
    Monopoly.setNextPlayerTurn();
};

//changes current player to the next player in turn
Monopoly.setNextPlayerTurn = function () {
    var currentPlayerTurn = Monopoly.getCurrentPlayer();
    var playerId = parseInt(currentPlayerTurn.attr("id").replace("player", ""));
    var nextPlayerId = playerId + 1;
    if (Monopoly.doubleCounter > 0 && !currentPlayerTurn.is(".jailed")) {  //player can roll the dice again after a double 
        var nextPlayerId = playerId;
    } else {
        var nextPlayerId = playerId + 1;
    }
    if (nextPlayerId > $(".player").length) {
        nextPlayerId = 1;
    }
    currentPlayerTurn.removeClass("current-turn");
    var nextPlayer = $(".player#player" + nextPlayerId);
    nextPlayer.addClass("current-turn");
    if (nextPlayer.is(".jailed")) { //added jailed class to css to add a sad face 
        var currentJailTime = parseInt(nextPlayer.attr("data-jail-time"));
        currentJailTime++;
        nextPlayer.attr("data-jail-time", currentJailTime);
        if (currentJailTime > 3) {
            nextPlayer.removeClass("jailed");
            nextPlayer.removeAttr("data-jail-time");
        }
        Monopoly.setNextPlayerTurn();
        return;
    }
    Monopoly.closePopup();
    Monopoly.allowRoll = true;
};

Monopoly.handleBuyProperty = function (player, propertyCell) {
    var propertyCost = Monopoly.calculatePropertyCost(propertyCell);
    var popup = Monopoly.getPopup("buy");
    popup.find(".cell-price").text(propertyCost);
    popup.find("button").unbind("click").bind("click", function () {
        var clickedBtn = $(this);
        if (clickedBtn.is("#yes")) {
            Monopoly.handleBuy(player, propertyCell, propertyCost);
        } else {
            Monopoly.closeAndNextTurn();
        }
    });
    Monopoly.showPopup("buy");
};

Monopoly.handlePayRent = function (player, propertyCell) {
    var popup = Monopoly.getPopup("pay");
    var currentRent = parseInt(propertyCell.attr("data-rent"));
    var propertyOwnerId = propertyCell.attr("data-owner");
    popup.find("#player-placeholder").text(propertyOwnerId);
    popup.find("#amount-placeholder").text(currentRent);
    popup.find("button").unbind("click").bind("click", function () {
        var propertyOwner = $(".player#" + propertyOwnerId);
        Monopoly.updatePlayersMoney(player, currentRent);
        Monopoly.updatePlayersMoney(propertyOwner, -1 * currentRent);
        Monopoly.closeAndNextTurn();
    });
    Monopoly.showPopup("pay");
};

Monopoly.handleGoToJail = function (player) {
    var popup = Monopoly.getPopup("jail");
    popup.find("button").unbind("click").bind("click", function () {
        Monopoly.handleAction(player, "jail");
    });
    Monopoly.showPopup("jail");
};

Monopoly.handleChanceCard = function (player) {
    var popup = Monopoly.getPopup("chance");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_chance_card", function (chanceJson) {
        popup.find(".popup-content #text-placeholder").text(chanceJson["content"]);
        popup.find(".popup-title").text(chanceJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action", chanceJson["action"]).attr("data-amount", chanceJson["amount"]);
    }, "json");
    popup.find("button").unbind("click").bind("click", function () {
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        Monopoly.handleAction(player, action, amount);
    });
    Monopoly.showPopup("chance");
};

//added implementation of community cards
Monopoly.handleCommunityCard = function (player) {
    var popup = Monopoly.getPopup("community");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_community_card", function (communityJson) {
        popup.find(".popup-content #text-placeholder").text(communityJson["content"]);
        popup.find(".popup-title").text(communityJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action", communityJson["action"]).attr("data-amount", communityJson["amount"]);
    }, "json");
    popup.find("button").unbind("click").bind("click", function () {
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        Monopoly.handleAction(player, action, amount);
    });
    Monopoly.showPopup("community");
};

//sends player to jail
Monopoly.sendToJail = function (player) {
    player.addClass("jailed");
    player.attr("data-jail-time", 1);
    $(".corner.game.cell.in-jail").append(player);
    Monopoly.playSound("woopwoop");
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};

Monopoly.getPopup = function (popupId) {
    return $(".popup-lightbox .popup-page#" + popupId);
};

Monopoly.calculatePropertyCost = function (propertyCell) {
    var cellGroup = propertyCell.attr("data-group");
    var cellPrice = parseInt(cellGroup.replace("group", "")) * 5;
    if (cellGroup == "rail") {
        cellPrice = 10;
    }
    return cellPrice;
};

Monopoly.calculatePropertyRent = function (propertyCost) {
    return propertyCost / 2;
};

Monopoly.closeAndNextTurn = function () {
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};

Monopoly.initPopups = function () {
    $(".popup-page#intro").find("button").click(function () {
        var numOfPlayers = $(this).closest(".popup-page").find("input").val();
        if (Monopoly.isValidInput("numofplayers", numOfPlayers)) {
            Monopoly.createPlayers(numOfPlayers);
            Monopoly.closePopup();
        }
    });
};

Monopoly.handleBuy = function (player, propertyCell, propertyCost) {
    var playersMoney = Monopoly.getPlayersMoney(player)
    if (playersMoney < propertyCost) {
        Monopoly.playSound("violin"); //added sound when user can't afford to buy property
        Monopoly.showErrorMsg();
    } else {
        Monopoly.updatePlayersMoney(player, propertyCost);
        var rent = Monopoly.calculatePropertyRent(propertyCost);
        propertyCell.removeClass("available")
            .addClass(player.attr("id"))
            .attr("data-owner", player.attr("id"))
            .attr("data-rent", rent);
        Monopoly.setNextPlayerTurn();
    }
};

Monopoly.handleAction = function (player, action, amount) {
    switch (action) {
        case "move":
            Monopoly.movePlayer(player, amount);
            break;
        case "pay":
            Monopoly.updatePlayersMoney(player, amount);
            Monopoly.setNextPlayerTurn();
            break;
        case "jail":
            Monopoly.sendToJail(player);
            break;
    };
    Monopoly.closePopup();
};

Monopoly.createPlayers = function (numOfPlayers) {
    var startCell = $(".go");
    for (var i = 1; i <= numOfPlayers; i++) {
        var player = $("<div />").addClass("player shadowed").attr("id", "player" + i).attr("title", "player" + i + ": $" + Monopoly.moneyAtStart);
        startCell.find(".content").append(player);
        if (i == 1) {
            player.addClass("current-turn");
        }
        player.attr("data-money", Monopoly.moneyAtStart);
    }
};

Monopoly.getNextCell = function (cell) {
    var currentCellId = parseInt(cell.attr("id").replace("cell", ""));
    var nextCellId = currentCellId + 1
    if (nextCellId > 40) {
        Monopoly.handlePassedGo();
        nextCellId = 1;
    }
    return $(".cell#cell" + nextCellId);
};

Monopoly.handlePassedGo = function () {
    var player = Monopoly.getCurrentPlayer();
    Monopoly.updatePlayersMoney(player, (-Monopoly.moneyAtStart / 10));
};

Monopoly.isValidInput = function (validate, value) {
    var isValid = false;
    switch (validate) {
        case "numofplayers":
            if (value > 1 && value <= 6) {
                isValid = true;
            }
            break;
    }
    if (!isValid) {
        Monopoly.showErrorMsg();
    }
    return isValid;

}

//shows an error message on pop-ups
Monopoly.showErrorMsg = function () {
    $(".popup-page .invalid-error").fadeTo(500, 1);
    setTimeout(function () {
        $(".popup-page .invalid-error").fadeTo(500, 0);
    }, 2000);
};

//make the board responsive
Monopoly.adjustBoardSize = function () {
    var gameBoard = $(".board");
    var boardSize = Math.min($(window).height(), $(window).width());
    boardSize -= parseInt(gameBoard.css("margin-top")) * 2;
    $(".board").css({ "height": boardSize, "width": boardSize });
}

//closes pop-up
Monopoly.closePopup = function () {
    $(".popup-lightbox").fadeOut();
};

// plays sound effects according to an action
Monopoly.playSound = function (sound) {
    var snd = new Audio("./sounds/" + sound + ".wav");
    snd.play();
}

Monopoly.showPopup = function (popupId) {
    $(".popup-lightbox .popup-page").hide();
    $(".popup-lightbox .popup-page#" + popupId).show();
    $(".popup-lightbox").fadeIn();
};

//invoke the function that initial the game
Monopoly.init();