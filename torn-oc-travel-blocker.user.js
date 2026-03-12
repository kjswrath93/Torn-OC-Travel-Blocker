// ==UserScript==
// @name         Torn OC Travel Blocker
// @namespace    https://github.com/
// @version      1.1
// @description  Blocks traveling 1 hour before Organized Crime and during OC
// @author       KJsWrath93
// @match        https://www.torn.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @license      MIT
// @updateURL https://raw.githubusercontent.com/kjswrath93/torn-oc-travel-blocker/main/torn-oc-travel-blocker.user.js
// @downloadURL https://raw.githubusercontent.com/kjswrath93/torn-oc-travel-blocker/main/torn-oc-travel-blocker.user.js
// ==/UserScript==

(function() {
'use strict';

const OC_WARNING_TIME = 3600;

let apiKey = GM_getValue("torn_api_key");

if (!apiKey) {
    apiKey = prompt("Enter your Torn API Key");
    if (apiKey) GM_setValue("torn_api_key", apiKey);
}

window.travelBlocked = false;

async function getOCData() {

    const url = `https://api.torn.com/faction/?selections=crimes&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.crimes) return null;

    let nextCrime = null;
    let crimeStarted = false;

    Object.values(data.crimes).forEach(crime => {

        if (crime.started) {
            crimeStarted = true;
        }

        if (crime.ready_at) {
            if (!nextCrime || crime.ready_at < nextCrime) {
                nextCrime = crime.ready_at;
            }
        }

    });

    return { nextCrime, crimeStarted };
}

function createBanner() {

    if (document.getElementById("ocTravelBanner")) return;

    const banner = document.createElement("div");
    banner.id = "ocTravelBanner";

    banner.style.position = "fixed";
    banner.style.zIndex = 999999;
    banner.style.padding = "10px 20px";
    banner.style.fontSize = "16px";
    banner.style.fontWeight = "bold";
    banner.style.borderRadius = "6px";
    banner.style.cursor = "move";

    let pos = GM_getValue("banner_pos");

    if (pos) {
        banner.style.left = pos.x + "px";
        banner.style.top = pos.y + "px";
    } else {
        banner.style.left = "20px";
        banner.style.top = "20px";
    }

    banner.innerText = "Checking OC status...";

    document.body.appendChild(banner);

    banner.onmousedown = function(e) {

        let shiftX = e.clientX - banner.getBoundingClientRect().left;
        let shiftY = e.clientY - banner.getBoundingClientRect().top;

        function moveAt(pageX, pageY) {
            banner.style.left = pageX - shiftX + 'px';
            banner.style.top = pageY - shiftY + 'px';
        }

        function onMouseMove(e) {
            moveAt(e.pageX, e.pageY);
        }

        document.addEventListener('mousemove', onMouseMove);

        document.onmouseup = function() {
            document.removeEventListener('mousemove', onMouseMove);
            document.onmouseup = null;

            GM_setValue("banner_pos", {
                x: parseInt(banner.style.left),
                y: parseInt(banner.style.top)
            });
        };

    };
}

function updateBanner(blocked) {

    const banner = document.getElementById("ocTravelBanner");
    if (!banner) return;

    if (blocked) {
        banner.style.background = "#b30000";
        banner.style.color = "white";
        banner.innerText = "TRAVEL BLOCKED – OC starting soon";
    } else {
        banner.style.background = "#1f9e3a";
        banner.style.color = "white";
        banner.innerText = "TRAVEL UNBLOCKED";
    }
}

function blockTravelActions() {

    document.addEventListener("click", function(e) {

        if (!window.travelBlocked) return;

        const element = e.target.closest("a,button");

        if (!element) return;

        const text = element.innerText?.toLowerCase() || "";
        const href = element.href || "";

        if (
            href.includes("travel") ||
            href.includes("air") ||
            text.includes("travel") ||
            text.includes("airport") ||
            text.includes("fly")
        ) {
            e.preventDefault();
            e.stopPropagation();
            alert("Travel blocked due to Organized Crime timer.");
        }

    }, true);
}

async function checkOC() {

    const data = await getOCData();
    if (!data) return;

    const now = Math.floor(Date.now() / 1000);

    if (data.crimeStarted) {

        window.travelBlocked = false;
        updateBanner(false);
        return;

    }

    const timeUntilOC = data.nextCrime - now;

    if (timeUntilOC <= OC_WARNING_TIME && timeUntilOC > 0) {

        window.travelBlocked = true;
        updateBanner(true);

    } else {

        window.travelBlocked = false;
        updateBanner(false);

    }
}

createBanner();
blockTravelActions();

setInterval(checkOC, 30000);

})();
