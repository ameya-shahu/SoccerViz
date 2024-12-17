const COMPETITION_SEASONS = [
  {
    name: "FIFA World Cup 2022",
    competition_id: "43",
    season_id: "106",
    logo_url:
      "https://upload.wikimedia.org/wikipedia/en/thumb/e/e3/2022_FIFA_World_Cup.svg/1200px-2022_FIFA_World_Cup.svg.png",
  },
  {
    name: "Women's World Cup 2023",
    competition_id: "72",
    season_id: "107",
    logo_url:
      "https://upload.wikimedia.org/wikipedia/en/thumb/2/24/Logo_of_the_2023_FIFA_Women%27s_World_Cup.svg/1200px-Logo_of_the_2023_FIFA_Women%27s_World_Cup.svg.png",
  },
];

let matchPlayerData = {};
let competitionId = null;
let seasonId = null;
let currentMatch = null;
let currentPlayer = null;
let matchesInfo = {};

// Add default weights at the top with other constants
const DEFAULT_WEIGHTS = {
  // Passing weights
  Packing: 1,
  "Pass Success": 1,
  "Area Rating": 1,
  "Passes Until Shot Pass": 1,
  "Overplayed Pressure": 1,
  Pressure: 1,

  // Duel weights
  "Pressure Duel": 1,
  "Duel Success": 1,
  "Passes Until Shot Duel": 1,
  "Duel Area": 1,

  // Shot weights
  Accuracy: 1,
  "Expected Goals": 1,
  "Shot Pressure": 1,

  // Overall weights
  "Pass Rating": 1,
  "Duel Rating": 1,
  "Shot Rating": 1,
};

// Initialize axisWeights with default values
let axisWeights = { ...DEFAULT_WEIGHTS };

// Initialize the dashboard
document.addEventListener("DOMContentLoaded", function () {
  renderCompetitionCard();
  $("#cardModal").modal("show");
});

// Modal functions
const showMainDiv = () => {
  $(".dashboard").removeClass("d-none").addClass("d-block");
};

const renderCompetitionCard = () => {
  const initModal = document.getElementById("init_modal");
  const rowDiv = document.createElement("div");
  rowDiv.classList.add("row");

  COMPETITION_SEASONS.forEach((competition, index) => {
    const colDiv = document.createElement("div");
    colDiv.classList.add("col-md-6");

    const cardDiv = document.createElement("div");
    cardDiv.classList.add("card");
    cardDiv.id = `card${index + 1}`;
    cardDiv.style.cursor = "pointer";
    cardDiv.style.alignItems = "center";
    cardDiv.setAttribute("data-competition-id", competition.competition_id);
    cardDiv.setAttribute("data-season-id", competition.season_id);

    const img = document.createElement("img");
    img.src = competition.logo_url;
    img.classList.add("card-img-top");
    img.classList.add("m-3");
    img.alt = competition.name;
    img.style.width = "150px";
    img.style.height = "150px";

    // Card body
    const cardBodyDiv = document.createElement("div");
    cardBodyDiv.classList.add("card-body");

    const cardTitle = document.createElement("h5");
    cardTitle.style.textAlign = "center";
    cardTitle.classList.add("card-title");
    cardTitle.innerText = competition.name;

    cardBodyDiv.appendChild(cardTitle);

    // Append Image and Card body to cardDiv
    cardDiv.appendChild(img);
    cardDiv.appendChild(cardBodyDiv);

    // Add click event listener
    cardDiv.addEventListener("click", function () {
      setupCompetitionSeasonListeners(
        this.getAttribute("data-competition-id"),
        this.getAttribute("data-season-id")
      );

      setupEventListeners();

      showMainDiv();
      $("#cardModal").modal("hide");
    });

    // Append the card to the column
    colDiv.appendChild(cardDiv);

    // Append the column to the row
    rowDiv.appendChild(colDiv);
  });
  initModal.appendChild(rowDiv);
};

function setupCompetitionSeasonListeners(competition, season) {
  competitionId = competition;
  seasonId = season;
  const matchSelect = document.getElementById("matchSelect");

  loadMatchesInfo(competitionId, seasonId).then(() => {
    if (matchSelect.options.length > 1) {
      matchSelect.selectedIndex = 1;
      const firstMatchId = matchSelect.value;
      currentMatch = firstMatchId;
      loadPlayerDataForMatch(firstMatchId);
    }
  });

  matchSelect.addEventListener("change", function (e) {
    const matchId = e.target.value;
    if (matchId) {
      currentMatch = matchId;
      loadPlayerDataForMatch(matchId);
    }
  });
}

function setupEventListeners() {
  const playerSelect = document.getElementById("playerSelect");
  const timeSlider = document.getElementById("time-slider");

  if (playerSelect) {
    playerSelect.addEventListener("change", function (e) {
      const selectedPlayer = e.target.value;
      if (selectedPlayer) {
        currentPlayer = matchPlayerData[currentMatch].stats.find(
          (player) => player.player_id === selectedPlayer
        );
        updateDashboard();
      }
    });
  }

  if (timeSlider) {
    timeSlider.addEventListener("input", function (e) {
      if (currentPlayer) {
        const positionsData = matchPlayerData[currentMatch]["positions"];
        const selectedTime = +e.target.value;
        document.getElementById(
          "time-display"
        ).textContent = `${selectedTime}'`;
        updateHeatmap(currentPlayer.player_name, selectedTime, positionsData);
        updateDefenseHeatmap(
          currentPlayer.player_name,
          selectedTime,
          positionsData
        );
      }
    });
  }
}

function populateSeasonSelect(competitionId) {
  const seasonSelect = document.getElementById("seasonSelect");
  resetSelect(seasonSelect);

  COMPETITION_SEASONS[competitionId].forEach((seasonId) => {
    const option = document.createElement("option");
    option.value = seasonId;
    option.textContent = `Season ${seasonId}`;
    seasonSelect.appendChild(option);
  });
}

function loadMatchesInfo(competitionId, seasonId) {
  const filePath = `./data/${competitionId}/${seasonId}/01_matches_info.json`;

  return fetch(filePath)
    .then((response) => response.json())
    .then((data) => {
      matchesInfo = data;
      populateMatchSelect(data);
      return data;
    })
    .catch((error) => {
      console.error("Error loading matches info:", error);
      showErrorState("Failed to load matches information");
    });
}

function populateMatchSelect(matches) {
  const matchSelect = document.getElementById("matchSelect");
  resetSelect(matchSelect);
  matchSelect.disabled = false;

  matches.forEach((match) => {
    const option = document.createElement("option");
    option.value = match.match_id;
    option.textContent = `${match.home_team} vs ${match.away_team} (${match.match_id})`;
    matchSelect.appendChild(option);
  });
}

function populatePlayerSelect(players) {
  const playerSelect = document.getElementById("playerSelect");
  resetSelect(playerSelect);
  playerSelect.disabled = false;

  players.forEach((player) => {
    const option = document.createElement("option");
    option.value = player.player_id;
    option.textContent = player.player_name;
    playerSelect.appendChild(option);
  });
}

function loadPlayerDataForMatch(matchId) {
  showLoadingState();

  Promise.all([
    d3.csv(
      `https://raw.githubusercontent.com/aprajitabhowal/SoccerViz/refs/heads/main/Data/${competitionId}/${seasonId}/match_stats_${matchId}.csv`
    ),
    fetch(
      `https://raw.githubusercontent.com/aprajitabhowal/SoccerViz/refs/heads/main/Data/${competitionId}/${seasonId}/pcp_${matchId}.json`
    ).then((res) => res.json()),
    fetch(
      `https://raw.githubusercontent.com/aprajitabhowal/SoccerViz/refs/heads/main/Data/${competitionId}/${seasonId}/player_mapping/player_mapping_${matchId}.json`
    ).then((res) => res.json()),
    d3.csv(
      `https://raw.githubusercontent.com/aprajitabhowal/SoccerViz/refs/heads/main/Data/${competitionId}/${seasonId}/match_${matchId}_positions.csv`
    ),
  ])
    .then(([csvData, pcpData, playerTeamMapping, positionsData]) => {
      matchPlayerData[matchId] = {
        stats: csvData,
        pcp: pcpData,
        playerTeamMapping: playerTeamMapping,
        positions: positionsData,
      };
      populatePlayerSelect(csvData);
      if (csvData.length > 0) {
        currentPlayer = csvData[0];
        const playerSelect = document.getElementById("playerSelect");
        playerSelect.value = currentPlayer.player_id;
        updateDashboard();
      }
    })
    .catch((error) => {
      console.error("Error loading match data:", error);
      showErrorState("Failed to load match data");
    })
    .finally(() => {
      hideLoadingState();
    });
}

// Add new function to prepare unweighted radar data
function prepareUnweightedRadarData(player) {
  return {
    passData: [
      { axis: "Packing", value: safeParse(player.avg_packing) },
      {
        axis: "Passes Until Shot Pass",
        value: safeParse(player.avg_passes_until_shot_pass),
      },
      { axis: "Area Rating", value: safeParse(player.avg_area_rating) },
      {
        axis: "Overplayed Pressure",
        value: safeParse(player.overplayed_pressure),
      },
      { axis: "Pressure", value: safeParse(player.avg_pressure_pass) },
      { axis: "Pass Success", value: safeParse(player.expected_pass_success) },
    ],
    duelData: [
      { axis: "Pressure Duel", value: safeParse(player.avg_pressure_duel) },
      { axis: "Duel Success", value: safeParse(player.expected_duel_success) },
      {
        axis: "Passes Until Shot Duel",
        value: safeParse(player.avg_passes_until_shot_duel),
      },
      { axis: "Duel Area", value: safeParse(player.avg_duel_area_rating) },
    ],
    shotData: [
      { axis: "Accuracy", value: safeParse(player.avg_shot_accuracy) },
      {
        axis: "Expected Goals",
        value: safeParse(player.expected_goal_success),
      },
      { axis: "Shot Pressure", value: safeParse(player.avg_pressure_shot) },
    ],
  };
}

function calculateRating(data) {
  const totalWeight = data.reduce((sum, d) => sum + (d.weight || 1), 0);

  const weightedSum = data.reduce(
    (sum, d) => sum + d.value * (d.weight || 1),
    0
  );
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

async function updateDashboard() {
  if (!currentPlayer || !currentMatch) return;

  // --------------------------------
  // Prepare Radar Chart
  // --------------------------------
  const radarData = prepareRadarData(currentPlayer);

  // Update radar charts
  drawRadarChart(radarData.passData, "#chart1");
  drawRadarChart(radarData.duelData, "#chart2");
  drawRadarChart(radarData.shotData, "#chart3");

  // Calculate individual scores using unweighted values for stats display
  const unweightedData = prepareUnweightedRadarData(currentPlayer);
  const passScore = calculateRating(unweightedData.passData);
  const duelScore = calculateRating(unweightedData.duelData);
  const shotScore = calculateRating(unweightedData.shotData);

  // Calculate weighted scores for overall performance only
  const weightedPassScore = calculateRating(radarData.passData);
  const weightedDuelScore = calculateRating(radarData.duelData);
  const weightedShotScore = calculateRating(radarData.shotData);

  // Update overall data with weighted scores
  const overallData = [
    {
      axis: "Pass Rating",
      value: weightedPassScore,
      weight: axisWeights["Pass Rating"] || 1,
    },
    {
      axis: "Duel Rating",
      value: weightedDuelScore,
      weight: axisWeights["Duel Rating"] || 1,
    },
    {
      axis: "Shot Rating",
      value: weightedShotScore,
      weight: axisWeights["Shot Rating"] || 1,
    },
  ];

  // Calculate weighted overall score
  const weightedOverallScore = calculateRating(overallData);

  // Update the overall performance chart
  drawRadarChart(overallData, "#chart4");

  // Update all stats containers with unweighted values
  updateStatsContainer(currentPlayer);

  // Update individual ratings displays with unweighted values
  document.getElementById(
    "Pass-Rating"
  ).textContent = `Pass Rating: ${passScore.toFixed(2)}`;
  document.getElementById(
    "Duel-Rating"
  ).textContent = `Duel Rating: ${duelScore.toFixed(2)}`;
  document.getElementById(
    "Shot-Rating"
  ).textContent = `Shot Rating: ${shotScore.toFixed(2)}`;
  document.getElementById(
    "Overall-Rating"
  ).textContent = `Overall Rating: ${weightedOverallScore.toFixed(2)}`;

  // Update chart4 text values explicitly
  document.getElementById("player-value").textContent =
    currentPlayer.player_name;
  document.getElementById("match-value").textContent = currentMatch;
  document.getElementById("pass-value").textContent = passScore.toFixed(2);
  document.getElementById("duel-value").textContent = duelScore.toFixed(2);
  document.getElementById("shot-value").textContent = shotScore.toFixed(2);

  // --------------------------------
  // Update bar chart
  // --------------------------------
  const allPlayerScores = prepareBarData(matchPlayerData[currentMatch].stats);
  drawBarChart(allPlayerScores, currentPlayer.player_name);

  // --------------------------------
  // Update PCP chart
  // --------------------------------
  const pcpData = matchPlayerData[currentMatch]["pcp"];
  const playerTeamMapping = matchPlayerData[currentMatch]["playerTeamMapping"];
  pcpController(pcpData, currentPlayer);

  // --------------------------------
  // Update heatmap
  // --------------------------------
  if (currentPlayer) {
    const positionsData = matchPlayerData[currentMatch]["positions"];
    const selectedTime = +d3.select("#time-slider").property("value");
    initializeHeatmap();
    updateHeatmap(currentPlayer.player_name, selectedTime, positionsData);
    updateDefenseHeatmap(
      currentPlayer.player_name,
      selectedTime,
      positionsData
    );
  }

  // --------------------------------
  // Update line chart
  // --------------------------------
  const { playerScores, matchDetails } = await prepareLineChartData();
  drawLineChart(playerScores, matchDetails);
}

function getStatsTypeFromChartId(chartId) {
  switch (chartId) {
    case "chart1":
      return "pass";
    case "chart2":
      return "duel";
    case "chart3":
      return "shot";
    default:
      return "overall";
  }
}

function updatePlayerStatsDisplay(player) {
  // Update passing stats
  document.getElementById("packing-value").textContent = formatValue(
    player.avg_packing
  );
  document.getElementById("pressure-value").textContent = formatValue(
    player.avg_pressure_pass
  );
  document.getElementById("expected-pass-value").textContent = formatValue(
    player.expected_pass_success
  );
  document.getElementById("passes-until-shot-value-pass").textContent =
    formatValue(player.avg_passes_until_shot_pass);
  document.getElementById("overplayed-pressure-value").textContent =
    formatValue(player.overplayed_pressure);
  document.getElementById("area-value").textContent = formatValue(
    player.avg_area_rating
  );

  // Update duel stats
  document.getElementById("pressure-value-duel").textContent = formatValue(
    player.avg_pressure_duel
  );
  document.getElementById("expected-duel-value").textContent = formatValue(
    player.expected_duel_success
  );
  document.getElementById("passes-until-shot-value-duel").textContent =
    formatValue(player.avg_passes_until_shot_duel);
  document.getElementById("area-value-duel").textContent = formatValue(
    player.avg_duel_area_rating
  );

  // Update shooting stats
  document.getElementById("accuracy-value").textContent = formatValue(
    player.avg_shot_accuracy
  );
  document.getElementById("pressure-value-shot").textContent = formatValue(
    player.avg_pressure_shot
  );
  document.getElementById("expected-goal-value").textContent = formatValue(
    player.expected_goal_success
  );

  // Update player info
  document.getElementById("player-value").textContent = player.player_name;
  document.getElementById("match-value").textContent = currentMatch;
}

function updateStatsContainer(player) {
  if (!player) return;

  // Update passing stats
  document.getElementById("packing-value").textContent = formatValue(
    player.avg_packing
  );
  document.getElementById("pressure-value").textContent = formatValue(
    player.avg_pressure_pass
  );
  document.getElementById("expected-pass-value").textContent = formatValue(
    player.expected_pass_success
  );
  document.getElementById("passes-until-shot-value-pass").textContent =
    formatValue(player.avg_passes_until_shot_pass);
  document.getElementById("overplayed-pressure-value").textContent =
    formatValue(player.overplayed_pressure);
  document.getElementById("area-value").textContent = formatValue(
    player.avg_area_rating
  );

  // Update duel stats
  document.getElementById("pressure-value-duel").textContent = formatValue(
    player.avg_pressure_duel
  );
  document.getElementById("expected-duel-value").textContent = formatValue(
    player.expected_duel_success
  );
  document.getElementById("passes-until-shot-value-duel").textContent =
    formatValue(player.avg_passes_until_shot_duel);
  document.getElementById("area-value-duel").textContent = formatValue(
    player.avg_duel_area_rating
  );

  // Update shooting stats
  document.getElementById("accuracy-value").textContent = formatValue(
    player.avg_shot_accuracy
  );
  document.getElementById("pressure-value-shot").textContent = formatValue(
    player.avg_pressure_shot
  );
  document.getElementById("expected-goal-value").textContent = formatValue(
    player.expected_goal_success
  );
}

function updateRatingDisplays(radarData) {
  const passScore = calculateRating(radarData.passData);
  const duelScore = calculateRating(radarData.duelData);
  const shotScore = calculateRating(radarData.shotData);
  const overallScore = (passScore + duelScore + shotScore) / 3;

  document.getElementById(
    "Pass-Rating"
  ).textContent = `Pass Rating: ${passScore.toFixed(2)}`;
  document.getElementById(
    "Duel-Rating"
  ).textContent = `Duel Rating: ${duelScore.toFixed(2)}`;
  document.getElementById(
    "Shot-Rating"
  ).textContent = `Shot Rating: ${shotScore.toFixed(2)}`;
  document.getElementById(
    "Overall-Rating"
  ).textContent = `Overall Rating: ${overallScore.toFixed(2)}`;
}

function drawAllRadarCharts(radarData) {
  // Draw the three radar charts using the prepared data
  if (radarData.passData) {
    drawRadarChart(radarData.passData, "#chart1");
  }

  if (radarData.duelData) {
    drawRadarChart(radarData.duelData, "#chart2");
  }

  if (radarData.shotData) {
    drawRadarChart(radarData.shotData, "#chart3");
  }

  if (radarData.overallData) {
    drawRadarChart(radarData.overallData, "#chart4");
  }
}

// Helper functions
function resetSelect(selectElement) {
  selectElement.innerHTML = `<option value="">Select ${selectElement.id.replace(
    "Select",
    ""
  )}</option>`;
}

function calculateWeightedScore(items) {
  const totalWeight = items.reduce((sum, item) => {
    return sum + (item.weight || 1);
  }, 0);

  const weightedSum = items.reduce((sum, item) => {
    return sum + item.value * (item.weight || 1);
  }, 0);

  const result = totalWeight > 0 ? weightedSum / totalWeight : 0;
  return result;
}

function prepareRadarData(player) {
  // Calculate weighted ratings
  const passScore = calculateWeightedScore([
    { value: safeParse(player.avg_packing), weight: axisWeights["Packing"] },
    {
      value: safeParse(player.expected_pass_success),
      weight: axisWeights["Pass Success"],
    },
    {
      value: safeParse(player.avg_area_rating),
      weight: axisWeights["Area Rating"],
    },
    {
      value: safeParse(player.avg_passes_until_shot_pass),
      weight: axisWeights["Passes Until Shot Pass"],
    },
    {
      value: safeParse(player.overplayed_pressure),
      weight: axisWeights["Overplayed Pressure"],
    },
    {
      value: safeParse(player.avg_pressure_pass),
      weight: axisWeights["Pressure"],
    },
  ]);

  const duelScore = calculateWeightedScore([
    {
      value: safeParse(player.avg_pressure_duel),
      weight: axisWeights["Pressure Duel"],
    },
    {
      value: safeParse(player.expected_duel_success),
      weight: axisWeights["Duel Success"],
    },
    {
      value: safeParse(player.avg_passes_until_shot_duel),
      weight: axisWeights["Passes Until Shot Duel"],
    },
    {
      value: safeParse(player.avg_duel_area_rating),
      weight: axisWeights["Duel Area"],
    },
  ]);

  const shotScore = calculateWeightedScore([
    {
      value: safeParse(player.avg_shot_accuracy),
      weight: axisWeights["Accuracy"],
    },
    {
      value: safeParse(player.expected_goal_success),
      weight: axisWeights["Expected Goals"],
    },
    {
      value: safeParse(player.avg_pressure_shot),
      weight: axisWeights["Shot Pressure"],
    },
  ]);

  return {
    passData: [
      {
        axis: "Packing",
        value: safeParse(player.avg_packing),
        weight: axisWeights["Packing"] || 1,
      },
      {
        axis: "Passes Until Shot Pass",
        value: safeParse(player.avg_passes_until_shot_pass),
        weight: axisWeights["Passes Until Shot Pass"] || 1,
      },
      {
        axis: "Area Rating",
        value: safeParse(player.avg_area_rating),
        weight: axisWeights["Area Rating"] || 1,
      },
      {
        axis: "Overplayed Pressure",
        value: safeParse(player.overplayed_pressure),
        weight: axisWeights["Overplayed Pressure"] || 1,
      },
      {
        axis: "Pressure",
        value: safeParse(player.avg_pressure_pass),
        weight: axisWeights["Pressure"] || 1,
      },
      {
        axis: "Pass Success",
        value: safeParse(player.expected_pass_success),
        weight: axisWeights["Pass Success"] || 1,
      },
    ],
    duelData: [
      {
        axis: "Pressure Duel",
        value: safeParse(player.avg_pressure_duel),
        weight: axisWeights["Pressure Duel"] || 1,
      },
      {
        axis: "Duel Success",
        value: safeParse(player.expected_duel_success),
        weight: axisWeights["Duel Success"] || 1,
      },
      {
        axis: "Passes Until Shot Duel",
        value: safeParse(player.avg_passes_until_shot_duel),
        weight: axisWeights["Passes Until Shot Duel"] || 1,
      },
      {
        axis: "Duel Area",
        value: safeParse(player.avg_duel_area_rating),
        weight: axisWeights["Duel Area"] || 1,
      },
    ],
    shotData: [
      {
        axis: "Accuracy",
        value: safeParse(player.avg_shot_accuracy),
        weight: axisWeights["Accuracy"] || 1,
      },
      {
        axis: "Expected Goals",
        value: safeParse(player.expected_goal_success),
        weight: axisWeights["Expected Goals"] || 1,
      },
      {
        axis: "Shot Pressure",
        value: safeParse(player.avg_pressure_shot),
        weight: axisWeights["Shot Pressure"] || 1,
      },
    ],
    overallData: [
      {
        axis: "Pass Rating",
        value: passScore,
        weight: axisWeights["Pass Rating"] || 1,
      },
      {
        axis: "Duel Rating",
        value: duelScore,
        weight: axisWeights["Duel Rating"] || 1,
      },
      {
        axis: "Shot Rating",
        value: shotScore,
        weight: axisWeights["Shot Rating"] || 1,
      },
    ],
  };
}

function prepareLineChartData() {
  const filePath = `./data/${competitionId}_player_stats_by_id.json`;

  let playerScores = [];
  let matchDetails = [];

  return fetch(filePath)
    .then((response) => response.json())
    .then((data) => {
      const playerInfo = data;

      for (const playerId in playerInfo) {
        const playerData = playerInfo[playerId];

        if (
          String(playerData["Player ID"]) === String(currentPlayer.player_id)
        ) {
          playerData.matches.forEach((match) => {
            const matchId = match.match_id;

            const matchInfo = matchesInfo.find((m) => m.match_id === matchId);
            const matchName = matchInfo
              ? `${matchInfo.home_team} vs ${matchInfo.away_team}`
              : `Match ${matchId}`;

            const matchScore = calculatePlayerScore(match.stats);

            playerScores.push({
              matchId,
              matchName,
              matchScore: matchScore.toFixed(2),
            });
          });

          break;
        }
      }

      matchDetails = playerScores.map(({ matchId, matchName }) => ({
        matchId,
        matchName,
      }));
      return { playerScores, matchDetails };
    })
    .catch((error) => {
      console.error("Error loading Player info:", error);
      showErrorState("Failed to load Player information");
      return { playerScores: [], matchDetails: [] };
    });
}

function prepareBarData(playersData) {
  return playersData
    .map((player) => ({
      name: player.player_name,
      score: calculatePlayerScore(player),
    }))
    .sort((a, b) => b.score - a.score);
}

function calculatePlayerScore(player) {
  const radarData = prepareRadarData(player);

  // Calculate weighted scores for each category
  const passScore = calculateRating(radarData.passData);
  const duelScore = calculateRating(radarData.duelData);
  const shotScore = calculateRating(radarData.shotData);

  // Create overall data with weights
  const overallData = [
    { value: passScore, weight: axisWeights["Pass Rating"] || 1 },
    { value: duelScore, weight: axisWeights["Duel Rating"] || 1 },
    { value: shotScore, weight: axisWeights["Shot Rating"] || 1 },
  ];

  // Calculate final weighted score
  return calculateRating(overallData);
}

// Helper functions
function formatValue(value) {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? "0.00" : parsed.toFixed(2);
}

function showLoadingState() {
  const loadingElement = document.getElementById("loading");
  if (loadingElement) {
    loadingElement.style.display = "block";
  }
}

function hideLoadingState() {
  const loadingElement = document.getElementById("loading");
  if (loadingElement) {
    loadingElement.style.display = "none";
  }
}

function showErrorState(message) {
  // Show error message to user
  const errorElement = document.getElementById("error");
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = "block";
  }
}

function safeParse(value) {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

// Export functions
window.setupCompetitionSeasonListeners = setupCompetitionSeasonListeners;
window.setupEventListeners = setupEventListeners;
window.updateDashboard = updateDashboard;
window.axisWeights = axisWeights;
