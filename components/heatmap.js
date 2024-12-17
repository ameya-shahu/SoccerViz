function initializeHeatmap() {
  // Set the dimensions for the soccer field visualization
  const width = 700;
  const height = width * 0.69;

  // Create SVG containers
  const svg = d3.select("#pitch").attr("width", width).attr("height", height);
  const defenseSvg = d3
    .select("#defense-pitch")
    .attr("width", width)
    .attr("height", height);

  // Clear existing content
  svg.selectAll("*").remove();
  defenseSvg.selectAll("*").remove();

  // Draw fields
  [svg, defenseSvg].forEach(drawField);

  // Create groups for the heatmaps
  svg.append("g").attr("class", "heatmap-group");
  defenseSvg.append("g").attr("class", "heatmap-group");
  defenseSvg.append("g").attr("class", "player-point-group");

  function drawField(svg) {
    // Background
    svg
      .append("rect")
      .attr("class", "field-background")
      .attr("width", width)
      .attr("height", height);

    // Outer border
    svg
      .append("rect")
      .attr("class", "field-line")
      .attr("width", width)
      .attr("height", height);

    // Center line
    svg
      .append("line")
      .attr("class", "field-line")
      .attr("x1", width / 2)
      .attr("y1", 0)
      .attr("x2", width / 2)
      .attr("y2", height);

    // Center circle
    svg
      .append("circle")
      .attr("class", "field-line")
      .attr("cx", width / 2)
      .attr("cy", height / 2)
      .attr("r", height / 10);

    // Penalty areas
    const penAreaWidth = width / 5;
    const penAreaHeight = height / 2.5;

    // Left and right penalty areas
    [0, width - penAreaWidth].forEach((x) => {
      svg
        .append("rect")
        .attr("class", "field-line")
        .attr("x", x)
        .attr("y", (height - penAreaHeight) / 2)
        .attr("width", penAreaWidth)
        .attr("height", penAreaHeight);
    });

    // Goal areas
    const goalAreaWidth = width / 10;
    const goalAreaHeight = height / 4;

    // Left and right goal areas
    [0, width - goalAreaWidth].forEach((x) => {
      svg
        .append("rect")
        .attr("class", "field-line")
        .attr("x", x)
        .attr("y", (height - goalAreaHeight) / 2)
        .attr("width", goalAreaWidth)
        .attr("height", goalAreaHeight);
    });
  }
}

function updateHeatmap(playerName, minute, positionsData) {
  const width = 700;
  const height = width * 0.69;

  // Create scales
  const x = d3.scaleLinear().domain([0, 120]).range([0, width]);
  const y = d3.scaleLinear().domain([0, 80]).range([height, 0]);

  // Color scale for attack heatmap
  const color = d3
    .scaleSequential()
    .interpolator(d3.interpolateYlOrRd)
    .domain([0, 0.0005]);

  // Filter data for selected player and time
  const playerData = positionsData.filter(
    (d) => d.player_name === playerName && +d.minute <= minute
  );

  // Generate density data
  const densityData = d3
    .contourDensity()
    .x((d) => x(+d.x))
    .y((d) => y(+d.y))
    .size([width, height])
    .bandwidth(25)
    .thresholds(20)(playerData);

  // Update visualization
  const heatmapGroup = d3.select("#pitch").select(".heatmap-group");
  heatmapGroup.selectAll("path").remove();

  heatmapGroup
    .selectAll("path")
    .data(densityData)
    .enter()
    .append("path")
    .attr("d", d3.geoPath())
    .attr("fill", (d) => color(d.value))
    .attr("opacity", 0.7);
}

function updateDefenseHeatmap(playerName, minute, positionsData) {
  const width = 700;
  const height = width * 0.69;

  // Create scales
  const x = d3.scaleLinear().domain([0, 120]).range([0, width]);
  const y = d3.scaleLinear().domain([0, 80]).range([height, 0]);

  // Color scale for defense heatmap
  const defenseColor = d3
    .scaleSequential()
    .interpolator(d3.interpolateBlues)
    .domain([0, 0.001]);

  // Get player's team
  const playerTeam = positionsData.find(
    (d) => d.player_name === playerName
  )?.team_name;

  // Get player position at specific minute
  const playerPosition = positionsData.find(
    (d) => d.player_name === playerName && +d.minute === minute
  );

  // Clear previous visualization
  const defenseHeatmapGroup = d3
    .select("#defense-pitch")
    .select(".heatmap-group");
  const playerPointGroup = d3
    .select("#defense-pitch")
    .select(".player-point-group");
  defenseHeatmapGroup.selectAll("path").remove();
  playerPointGroup.selectAll("circle").remove();

  if (playerPosition) {
    // Define radius around player to consider
    const radius = 20;

    // Get opposing team positions
    const opposingPositions = positionsData.filter(
      (d) =>
        d.team_name !== playerTeam &&
        +d.minute === minute &&
        d.player_name !== "null" &&
        Math.sqrt(
          Math.pow(+d.x - +playerPosition.x, 2) +
            Math.pow(+d.y - +playerPosition.y, 2)
        ) <= radius
    );

    // Draw player point
    playerPointGroup
      .append("circle")
      .attr("class", "player-point")
      .attr("cx", x(+playerPosition.x))
      .attr("cy", y(+playerPosition.y))
      .attr("r", 5)
      .on("mouseover", function (event) {
        d3.select("#tooltip")
          .style("opacity", 1)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px")
          .html(`${playerName}`);
      })
      .on("mouseout", function () {
        d3.select("#tooltip").style("opacity", 0);
      });

    // Create density heatmap for nearby opponents
    const densityData = d3
      .contourDensity()
      .x((d) => x(+d.x))
      .y((d) => y(+d.y))
      .size([width, height])
      .bandwidth(15)
      .thresholds(12)(opposingPositions);

    defenseHeatmapGroup
      .selectAll("path")
      .data(densityData)
      .enter()
      .append("path")
      .attr("d", d3.geoPath())
      .attr("fill", (d) => defenseColor(d.value))
      .attr("opacity", 0.7);
  }
}
