let matchPlayerData = {}; 
let currentMatch = "3893792"; 
let currentPlayer = null; 
let axisWeights = {}; 
let chartData1={}
let chartData2={}
let chartData3={}
let chartData4={}
let PassRating=0
let DuelRating =0
let ShotRating = 0
let OverAllScore=0
// On page load, ensure that the default match is selected and the first player is displayed in the dropdown
document.addEventListener('DOMContentLoaded', function() {
  loadPlayerDataForMatch(currentMatch); // Load data for the default match when the page loads
});
document.getElementById("matchSelect").addEventListener("change", function() {
  currentMatch = this.value;  // Update the selected match
  loadPlayerDataForMatch(currentMatch);  // Load data for the new match
});

// Initialize the player dropdown and listen for changes
document.getElementById("playerSelect").addEventListener("change", function() {
  const selectedPlayerId = this.value;
  currentPlayer = matchPlayerData[currentMatch].find(player => player.player_id === selectedPlayerId);
  drawAllRadarCharts(currentPlayer); 
  updatePlayerStatsDisplay(currentPlayer) // Redraw radar chart for the new player
  // updateOverallRating();  // Update overall score based on the selected player
});

// Load the player data from the CSV file dynamically based on match_id
function loadPlayerDataForMatch(matchId) {
  const filePath = `/Data/match_stats_${matchId}.csv`;
  console.log(filePath);

  // Load the CSV file using d3.csv
  d3.csv(filePath).then(function(data) {
    matchPlayerData[matchId] = data; 
    updatePlayerDropdown(); 
  }).catch(function(error) {
    console.error("Error loading the CSV file:", error);
  });
}

// Update the player dropdown based on the selected match
function updatePlayerDropdown() {
  const playerSelect = document.getElementById("playerSelect");
  playerSelect.innerHTML = ''; // Clear the previous options

  const players = matchPlayerData[currentMatch];  // Get players for the selected match

  if (players && players.length > 0) {
    players.forEach(function(player) {
      const option = document.createElement("option");
      option.value = player.player_id;
      option.text = player.player_name;
      playerSelect.appendChild(option);
    });

    // Set the default player selection (first player)
    currentPlayer = players[0];
    // updatePlayerStatsDisplay(currentPlayer);
    drawAllRadarCharts(currentPlayer);
    // updatePlayerStatsDisplay(currentPlayer);
    // updateOverallRating();  // Update the overall score display
  }
}
function updatePlayerStatsDisplay(player) {
  document.getElementById("packing-value").textContent = player.avg_packing;
  document.getElementById("pressure-value").textContent = player.avg_pressure_pass;
  document.getElementById("expected-pass-value").textContent = player.expected_pass_success;
  document.getElementById("passes-until-shot-value-pass").textContent = player.avg_passes_until_shot_pass;
  document.getElementById("overplayed-pressure-value").textContent = player.overplayed_pressure;
  document.getElementById("area-value").textContent = player.avg_area_rating;
  document.getElementById("pressure-value-duel").textContent = player.avg_pressure_duel;
  document.getElementById("expected-duel-value").textContent = player.expected_duel_success;
  document.getElementById("passes-until-shot-value-duel").textContent = player.avg_passes_until_shot_duel;
  document.getElementById("area-value-duel").textContent = player.avg_duel_area_rating;
  document.getElementById("accuracy-value").textContent = player.avg_shot_accuracy;
  document.getElementById("pressure-value-shot").textContent = player.avg_pressure_shot;
  document.getElementById("expected-goal-value").textContent = player.expected_goal_success;
  document.getElementById("player-value").textContent = player.player_name;
  document.getElementById("match-value").textContent = currentMatch;
  document.getElementById("pass-value").textContent = PassRating;
  document.getElementById("duel-value").textContent = DuelRating;
  document.getElementById("shot-value").textContent = ShotRating;
}

// Safe parsing function to ensure that the data is valid
function safeParse(value) {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed; // Return 0 if the value is NaN
}

// Draw radar charts for the selected player
function drawAllRadarCharts(player) {
   chartData1 = [
    { axis: "Packing", value: safeParse(player.avg_packing), weight: axisWeights["Packing"] || 1 },
    { axis: "Passes Until Shot Pass", value: safeParse(player.avg_passes_until_shot_pass), weight: axisWeights["Passes Until Shot Pass"] || 1 },
    { axis: "Area Rating", value: safeParse(player.avg_area_rating), weight: axisWeights["Area Rating"] || 1 },
    { axis: "Overplayed Pressure", value: safeParse(player.overplayed_pressure), weight: axisWeights["Overplayed Pressure"] || 1 },
    { axis: "Pressure", value: safeParse(player.avg_pressure_pass), weight: axisWeights["Pressure"] || 1 },
    { axis: "Pass Success", value: safeParse(player.expected_pass_success), weight: axisWeights["Pass Success"] || 1 }
  ];
   chartData2 = [
    { axis: "Pressure Duel", value: safeParse(player.avg_pressure_duel), weight: axisWeights["Pressure Duel"] || 1 },
    { axis: "Duel Success", value: safeParse(player.expected_duel_success), weight: axisWeights["Duel Success"] || 1 },
    { axis: "Passes Until Shot Duel", value: safeParse(player.avg_passes_until_shot_duel), weight: axisWeights["Passes Until Shot Duel"] || 1 },
    { axis: "Duel Area", value: safeParse(player.avg_duel_area_rating), weight: axisWeights["Duel Area"] || 1 },
  ];
   chartData3 = [
    { axis: "Accuracy", value: safeParse(player.avg_shot_accuracy), weight: axisWeights["Accuracy"] || 1 },
    { axis: "Expected Goals", value: safeParse(player.expected_goal_success), weight: axisWeights["Expected Goals"] || 1 },
    { axis: "Shot Pressure", value: safeParse(player.avg_pressure_shot), weight: axisWeights["Shot Pressure"] || 1 },
  ];
  
  // Clear the previous chart and draw the new one
  d3.select("#chart1").selectAll("*").remove(); // Clear the existing chart before drawing a new one
  drawRadarChart(chartData1, '#chart1');
  PassRating= updateRating('#Pass-Rating',chartData1);
  // updateAxisClickListeners(chartData1);  // Add click listeners to the axes dynamically

  d3.select("#chart2").selectAll("*").remove(); // Clear the existing chart before drawing a new one
  drawRadarChart(chartData2, '#chart2');
  DuelRating=updateRating('#Duel-Rating',chartData2);
  // updateAxisClickListeners(chartData2);  // Add click listeners to the axes dynamically

  d3.select("#chart3").selectAll("*").remove(); // Clear the existing chart before drawing a new one
  drawRadarChart(chartData3, '#chart3');
  ShotRating=updateRating('#Shot-Rating',chartData3);
  // updateAxisClickListeners(chartData3);  // Add click listeners to the axes dynamically
  // console.log(PassRating)
  // console.log(DuelRating)
  // console.log(ShotRating)
  chartData4 = [
    { axis: "Pass Rating", value: safeParse(PassRating), weight: axisWeights["Pass Rating"] || 1 },
    { axis: "Duel Rating", value: safeParse(DuelRating), weight: axisWeights["Duel Rating"] || 1 },
    { axis: "Shot Rating", value: safeParse(ShotRating), weight: axisWeights["Shot Rating"] || 1 },
  ];
  d3.select("#chart4").selectAll("*").remove();
  drawRadarChart(chartData4, '#chart4');
  // ShotRating=updateRating('Overall-Rating',chartData4);
  overallScore= updateOverallRating('#chart4',chartData4)
  console.log('overallscore',overallScore)
  updatePlayerStatsDisplay(currentPlayer);

  // Recalculate scores for all players
  const weights = Object.entries(axisWeights).map(([axis, value]) => ({ axis, value }));
  const allPlayerScores = calculateScoresForAllPlayers(matchPlayerData[currentMatch], weights);

  // Redraw bar chart
  drawBarChart(allPlayerScores, player.player_name);
}

function drawRadarChart(data, selector) {
  const totalAxes = data.length;
  const radius = Math.min(200, 200) / 2; // Radius of the radar chart
  const angleSlice = Math.PI * 2 / totalAxes; // Angle between axes

  // Create the SVG container and ensure the SVG dimensions are appropriate
  const svg = d3.select(selector)
    .append("svg")
    .attr("width", 300) // Ensure this is large enough for the chart
    .attr("height", 300)
    .append("g")
    .attr("transform", "translate(150, 150)"); // Center the chart inside the SVG

  // Scale the data to fit within the radar chart's radius
  const radialScale = d3.scaleLinear()
    .domain([0, 10])  // Domain should be from 0 to 10
    .range([0, radius]); // Output range is from 0 to the chart's radius

  // Function to draw the radar grid (lines)
  const grid = svg.append("g").attr("class", "grid");

  grid.selectAll(".circle")
    .data(d3.range(1, 11)) // Create 10 circles
    .enter().append("circle")
    .attr("class", "circle")
    .attr("r", d => (radius / 10) * d) // Scale radius to fit within the chart radius
    .style("fill", "none")
    .style("stroke", "gray")
    .style("stroke-width", 0.5);

  // Add the axes as clickable lines (extend the lines beyond the chart)
  const axisGrid = svg.append("g").attr("class", "axis");
  axisGrid.selectAll(".axisLine")
    .data(data)
    .enter().append("path")
    .attr("class", "axisLine")
    .attr("d", function(d, i) {
        const x1 = radialScale(0) * Math.cos(angleSlice * i - Math.PI / 2);
        const y1 = radialScale(0) * Math.sin(angleSlice * i - Math.PI / 2);
        const x2 = radialScale(10) * Math.cos(angleSlice * i - Math.PI / 2);
        const y2 = radialScale(10) * Math.sin(angleSlice * i - Math.PI / 2);
        return `M${x1},${y1}L${x2},${y2}`;
    })
    .style("stroke", "gray")
    .style("stroke-width", 2)
    .style("cursor", "pointer")
    .on("click", function(event, d) {
        const axisName = d.axis; 
        showWeightSelectionControls(axisName, data);  // Show weight selection for the clicked axis
    });

  // Add axis labels outside the chart, but ensure they are fully visible
  axisGrid.selectAll(".axisLabel")
  .data(data)
  .enter().append("text")
  .attr("class", "axisLabel")
  .attr("x", (d, i) => (radialScale(10) * 1.2) * Math.cos(angleSlice * i - Math.PI / 2)) 
  .attr("y", (d, i) => (radialScale(10) * 1.2) * Math.sin(angleSlice * i - Math.PI / 2))
  .attr("dy", "0.35em")
  .attr("text-anchor", "middle")
  .text(d => d.axis)
  .style("font-size", "8px")
  .style("fill", "#333");

  // Create a line generator to connect the data points
  const line = d3.lineRadial()
    .radius(d => Math.min(radialScale(d.weight), radius)) // Ensure that radius does not exceed the chart's boundary
    .angle((d, i) => angleSlice * i);

  // Draw the radar polygon (only connecting data points)
  svg.append("path")
    .data([data])
    .attr("class", "radarChart")
    .attr("d", line)
    .style("fill", "rgba(0, 128, 255, 0.5)") // Fill color
    .style("stroke", "#0080ff") // Border color
    .style("stroke-width", 2)
    .style("fill-opacity", 0.5);

  // Optional: Add a circle at each data point
  svg.selectAll(".radarPoint")
    .data(data)
    .enter().append("circle")
    .attr("class", "radarPoint")
    .attr("cx", (d, i) => Math.min(radialScale( d.weight), radius) * Math.cos(angleSlice * i - Math.PI / 2)) // Clip to the radius
    .attr("cy", (d, i) => Math.min(radialScale(d.weight), radius) * Math.sin(angleSlice * i - Math.PI / 2)) // Clip to the radius
    .attr("r", 4)
    .style("fill", "#0080ff")
    .style("stroke", "white")
    .style("stroke-width", 1);

  // Ensure that the clickable area is within the chart boundaries
  svg.selectAll(".axisLine")
    .each(function(d, i) {
        const x1 = radialScale(0) * Math.cos(angleSlice * i - Math.PI / 2);
        const y1 = radialScale(0) * Math.sin(angleSlice * i - Math.PI / 2);
        const x2 = radialScale(10) * Math.cos(angleSlice * i - Math.PI / 2);
        const y2 = radialScale(10) * Math.sin(angleSlice * i - Math.PI / 2);
        const linePath = d3.select(this);
        // Creating an invisible clickable area within the chart
        linePath.append("rect")
            .attr("x", Math.min(x1, x2) - 20)
            .attr("y", Math.min(y1, y2) - 20)
            .attr("width", Math.abs(x1 - x2) + 40)
            .attr("height", Math.abs(y1 - y2) + 40)
            .style("fill", "transparent")
            .style("cursor", "pointer")
            .on("click", function(event, d) {
                const axisName = d.axis;
                showWeightSelectionControls(axisName, data);  // Show weight selection for the clicked axis
            });
    });
}


function updateAxisClickListeners(data) {
    const axes = document.querySelectorAll('.axisLine');
    axes.forEach(axis => {
        axis.addEventListener('click', function() {
            const axisName = this.__data__.axis;  // Get the name of the clicked axis
            showWeightSelectionControls(axisName, data);  // Show weight selection for the clicked axis
        });
    });
}

// Show weight controls for a given axis when clicked
function showWeightSelectionControls(axisName,data) {
  data = Array.from(data);
    const weightControlsContainer1 = document.getElementById('weightControls1');
    const weightControlsContainer2 = document.getElementById('weightControls2');
    const weightControlsContainer3 = document.getElementById('weightControls3');
    const weightControlsContainer4 = document.getElementById('weightControls4');
    weightControlsContainer1.innerHTML = ''; // Clear any previous controls
    weightControlsContainer2.innerHTML = ''; // Clear any previous controls
    weightControlsContainer3.innerHTML = ''; // Clear any previous controls
    weightControlsContainer4.innerHTML = ''; // Clear any previous controls
  
    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('weight-button-container');
    buttonContainer.innerHTML = `<strong>${axisName}</strong>: `;
    let targetContainer;
    if (data.length===6) {
      targetContainer = weightControlsContainer1;
    } else if (data.length === 4) {
      targetContainer = weightControlsContainer2;
    } else if (data.length === 3 ) {
      const axisNames = data.map(item => item.axis);
  
  // Check if 'Accuracy' is in the axisNames array (for example)
  if (axisNames.includes("Accuracy")) {
    targetContainer = weightControlsContainer3;
  } else {
    // Handle other 3-axis charts, if needed
    targetContainer = weightControlsContainer4;
  }
    } else {
      console.error('Unknown dataset');
      return;
    }

    [0, 2, 4, 6, 8, 10].forEach(function(weight) {
      const button = document.createElement("button");
      button.innerText = weight;
      button.classList.add("weight-button");
      button.onclick = function() {
        axisWeights[axisName] = weight;  // Update the weight for the axis
        drawAllRadarCharts(currentPlayer);  // Redraw chart with new weight
        updateOverallRating('#chart4',chartData4);  // Recalculate the score
      };
      buttonContainer.appendChild(button);
    });
  
    // Add reset button to reset weights
    const resetButton = document.createElement("button");
    resetButton.innerText = "Reset Weights";
    resetButton.classList.add("reset-button");
    resetButton.onclick = function() {
      resetWeights();  // Reset weights to default
      drawAllRadarCharts(currentPlayer);  // Redraw the chart with reset weights
      updateOverallRating('#chart4',chartData4);  // Recalculate the score
    };
  
    buttonContainer.appendChild(resetButton);
    targetContainer.appendChild(buttonContainer);
  }
// Function to reset all axis weights to the default value (1)
function resetWeights() {
    axisWeights = {};  }
    


function updateRating(selector,data){
  const overallScore = calculateEventRating(data);
  d3.select(selector).text(`${selector}:${overallScore.toFixed(2)}`);
  return overallScore
}
function calculateEventRating(data) {
  const axisToPlayerMapping = {
    "Packing": "avg_packing", 
    "Passes Until Shot Pass": "avg_passes_until_shot_pass",
    "Passes Until Shot Duel": "avg_passes_until_shot_duel", 
    "Area Rating": "area_rating", 
    "Overplayed Pressure": "overplayed_pressure", 
    "Pressure": "avg_pressure_pass",
    "Pass Success": "avg_expected_pass_success", 
    "Pressure Duel": "avg_pressure_duel", 
    "Duel Success": "avg_expected_duel_success", 
    "Duel Pass Length": "total_duels",
    "Duel Area": "avg_duel_area_rating", 
    "Accuracy": "avg_shot_accuracy", 
    "Expected Goals": "avg_expected_goal_success", 
    "Shot Pressure": "avg_pressure_shot" 
  };
  
  if (currentPlayer) {
    // Extract the axis names dynamically from the data
    const weightedScores = data.map(item => item.axis);
    console.log(weightedScores);

    // Calculate the total weight (sum of the weights for each axis)
    const totalWeight = weightedScores.reduce((sum, axis) => {
      return sum + (axisWeights[axis] || 1); // Default weight is 1 if not set
    }, 0);

    // Calculate the total score (weighted sum of values)
    const totalScore = weightedScores.reduce((sum, axis) => {
      // Get the corresponding player property using the mapping
      const axisKey = axisToPlayerMapping[axis]; // Look up the correct property name
      if (axisKey) {
        const playerValue = currentPlayer[axisKey]; // Access the currentPlayer property dynamically
        console.log(`axis: ${axis}, axisKey: ${axisKey}, playerValue: ${playerValue}`);
        
        return sum + (axisWeights[axis] || 1) * safeParse(playerValue);
      } else {
        console.error(`No mapping found for axis: ${axis}`);
        return sum; // Skip this axis if no mapping is found
      }
    }, 0);

    // console.log('Total Score:', totalScore);
    // console.log('Total Weight:', totalWeight);

    // Return the weighted score (total score / total weight)
    return totalScore / totalWeight;
  }

  return 0; // Return 0 if currentPlayer is not available
}

function updateOverallRating(selector,data){
  const overallScore = calculateOverallRating(data);
  d3.select('#Overall-Rating').text(`#Overall-Rating:${overallScore.toFixed(2)}`);
  return overallScore
}
function calculateOverallRating(data) {


  const ratings = {
    PassRating: PassRating,
    DuelRating: DuelRating,
    ShotRating: ShotRating,
  };
  
  const axisToPlayerMapping = {
    "Pass Rating": "PassRating", 
    "Duel Rating": "DuelRating", 
    "Shot Rating": "ShotRating", 
  };
  
  if (currentPlayer) {
    // Extract the axis names dynamically from the data
    const weightedScores = data.map(item => item.axis);
    console.log('here',weightedScores);

    // Calculate the total weight (sum of the weights for each axis)
    const totalWeight = weightedScores.reduce((sum, axis) => {
      return sum + (axisWeights[axis] || 1); // Default weight is 1 if not set
    }, 0);

    // Calculate the total score (weighted sum of values)
    const totalScore = weightedScores.reduce((sum, axis) => {
      // Get the corresponding player property using the mapping
      const axisKey = axisToPlayerMapping[axis]; // Look up the correct property name
      if (axisKey) {
        // Access the rating value from the global ratings object
        const playerValue = ratings[axisKey]; // Use the `ratings` object to access the value
        return sum + (axisWeights[axis] || 1) * safeParse(playerValue);
      } else {
        console.error(`No mapping found for axis: ${axis}`);
        return sum; // Skip this axis if no mapping is found
      }
    }, 0);



    console.log('Total Score:', totalScore);
    console.log('Total Weight:', totalWeight);

    // Return the weighted score (total score / total weight)
    return totalScore / totalWeight;
  }

  return 0; // Return 0 if currentPlayer is not available
}

function drawBarChart(playerScores, selectedPlayerName) {
    const barChart = d3.select("#barChart");
    barChart.selectAll("*").remove(); // Clear existing chart

    // Sort the playerScores array by score in ascending order
    playerScores.sort((a, b) => a.score - b.score);

    const width = 1000;
    const height = 600;
    const margin = { top: 20, right: 30, bottom: 50, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = barChart.append("g")
        .attr("transform", `translate(${margin.left - 280},${margin.top - 200})`);

    // Create tooltip reference
    const tooltip = d3.select("#tooltip");

    // Scales
    const xScale = d3.scaleBand()
        .domain(playerScores.map(d => d.name))
        .range([0, chartWidth])
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(playerScores, d => d.score)]) // Scale based on max score
        .range([chartHeight, 0]);

    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    svg.append("g").call(d3.axisLeft(yScale));

    // Bind Data
    const bars = svg.selectAll(".bar")
        .data(playerScores, d => d.name); // Key bars by player name

    // Enter Bars (for new data points)
    const enteredBars = bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.name))
        .attr("y", chartHeight) // Start from the bottom of the chart
        .attr("width", xScale.bandwidth())
        .attr("height", 0) // Initial height is 0
        .attr("fill", d => d.name === selectedPlayerName ? "orange" : "steelblue");

    // Add Tooltip Event Listeners to Enter Selection
    enteredBars
        .on("mouseover", function (event, d) {
            tooltip.style("display", "block")
                .html(`<strong>${d.name}</strong><br>Rating: ${d.score.toFixed(2)}`);
            d3.select(this).attr("fill", "darkblue"); // Highlight bar
        })
        .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function (event, d) {
            tooltip.style("display", "none");
            d3.select(this).attr("fill", d.name === selectedPlayerName ? "orange" : "steelblue"); // Reset color
        });

    // Merge Enter and Update Selections
    enteredBars.merge(bars)
        .transition() // Apply transition
        .duration(1000) // 1-second duration
        .attr("y", d => yScale(d.score)) // Move to final position based on score
        .attr("height", d => chartHeight - yScale(d.score)); // Set final height based on score

    // Exit Bars (for removed data points)
    bars.exit()
        .transition()
        .duration(1000)
        .attr("y", chartHeight) // Animate to the bottom
        .attr("height", 0) // Shrink height to zero
        .remove();

    // Add Legend
    const legend = barChart.append("g")
        .attr("transform", `translate(${margin.left + 500}, ${height - margin.bottom - 850})`);

    legend.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 20)
        .attr("height", 20)
        .attr("fill", "orange");

    legend.append("text")
        .attr("x", 30)
        .attr("y", 15)
        .text("Selected Player")
        .style("font-size", "14px")
        .attr("alignment-baseline", "middle");
}

function calculateScoresForAllPlayers(players, weights) {
  return players.map(player => {
      const overallScore = calculateOverallScore(player, weights);
      return { name: player.player_name, score: overallScore };
  });
}

function calculateOverallScore(player, weights) {
  const axisToPlayerMapping = {
      "Packing": "avg_packing",
      "Passes Until Shot Pass": "avg_passes_until_shot_pass",
      "Passes Until Shot Duel": "avg_passes_until_shot_duel",
      "Area Rating": "avg_area_rating",
      "Overplayed Pressure": "overplayed_pressure",
      "Pressure": "avg_pressure_pass",
      "Pass Success": "expected_pass_success",
      "Pressure Duel": "avg_pressure_duel",
      "Duel Success": "expected_duel_success",
      "Duel Pass Length": "total_duels",
      "Duel Area": "avg_duel_area_rating",
      "Accuracy": "avg_shot_accuracy",
      "Expected Goals": "expected_goal_success",
      "Shot Pressure": "avg_pressure_shot"
  };

  const totalWeight = weights.reduce((sum, weight) => sum + weight.value, 0);

  const totalScore = weights.reduce((sum, weight) => {
      const playerProperty = axisToPlayerMapping[weight.axis];
      const value = parseFloat(player[playerProperty]);
      if (!isNaN(value)) {
          return sum + (weight.value * value);
      }
      return sum;
  }, 0);

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}























//////////////////////////////////////////////////////////////////////////////////
// Update the overall score based on selected player and adjusted weights
// function updateOverallScore() {
//   const overallScore = calculateOverallScore();
//   d3.select("Overall-Rating").text(`Overall Rating: ${overallScore.toFixed(2)}`);
// }

// // Calculate the overall score for the player using weighted average
// function calculateOverallScore() {
//   if (currentPlayer) {
//     const weightedScores = [
//       "Pass Rating", 
//       "Shot Rating", 
//       "Duel Rating", 
//     ];
//     const totalWeight = weightedScores.reduce((sum, axis) => sum + (axisWeights[axis] || 1), 0);
//     const totalScore = weightedScores.reduce((sum, axis) => {
//       console.log(axis)
      
//       const axisKey = axis.replace(" ", "");  
//       console.log(axisKey)// Remove spaces from axis name
//     const playerData = safeParse(`${axisKey}`); // Use the cleaned axis name
//     console.log(playerData)
//     return sum + (axisWeights[axis] || 1) * playerData;}
    

//     );
//     console.log(totalScore,totalWeight)
//     return totalScore / totalWeight;
    
//   }
//   return 0;
// }
