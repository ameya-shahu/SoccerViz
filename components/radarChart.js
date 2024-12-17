function drawRadarChart(data, selector) {
  const width = 300;
  const height = 300;
  const margin = { top: 50, right: 50, bottom: 50, left: 50 };
  const radius = Math.min(width, height) / 2 - margin.top;

  // Clear existing chart
  d3.select(selector).selectAll("*").remove();

  const svg = d3
    .select(selector)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);

  // Scale for the axes
  const radialScale = d3.scaleLinear().domain([0, 10]).range([0, radius]);

  // Calculate angles for each axis
  const angleSlice = (Math.PI * 2) / data.length;

  // Draw the grid lines
  const levels = 10;
  svg
    .selectAll(".gridLine")
    .data(d3.range(1, levels + 1))
    .enter()
    .append("circle")
    .attr("class", "gridLine")
    .attr("r", (d) => (radius / levels) * d)
    .style("fill", "none")
    .style("stroke", "#CDCDCD")
    .style("stroke-dasharray", "4,4");

  // Draw the axes with click interaction
  const axes = svg
    .selectAll(".axis")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "axis")
    .style("cursor", "pointer")
    .on("click", function (event, d) {
      showWeightControls(d.axis, data, selector, {
        x: event.pageX,
        y: event.pageY,
      });
    });

  axes
    .append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr(
      "x2",
      (d, i) => radialScale(10) * Math.cos(angleSlice * i - Math.PI / 2)
    )
    .attr(
      "y2",
      (d, i) => radialScale(10) * Math.sin(angleSlice * i - Math.PI / 2)
    )
    .style("stroke", "#CDCDCD")
    .style("stroke-width", "1px");

  // Update the line generator to use weight levels instead of values
  const line = d3
    .lineRadial()
    .radius((d) => {
      const weight = window.axisWeights[d.axis] || 0;

      const level = Math.ceil((weight / 10) * 10);
      return radialScale(level * 1);
    })
    .angle((d, i) => angleSlice * i);

  // Update the polygon with weight levels
  svg
    .append("path")
    .data([data])
    .attr("class", "radarChart")
    .attr("d", line)
    .style("fill", "rgba(0, 128, 255, 0.5)")
    .style("stroke", "#0080ff")
    .style("stroke-width", 2)
    .style("fill-opacity", 0.5);

  // Add axis labels with weight indicators
  axes
    .append("text")
    .attr("class", "axisLabel")
    .attr(
      "x",
      (d, i) => radialScale(10.5) * Math.cos(angleSlice * i - Math.PI / 2)
    )
    .attr(
      "y",
      (d, i) => radialScale(10.5) * Math.sin(angleSlice * i - Math.PI / 2)
    )
    .text((d) => `${d.axis} (${window.axisWeights[d.axis] || 1}x)`)
    .style("font-size", "10px")
    .style("text-anchor", "middle");

  // Update points with weight levels
  svg
    .selectAll(".radarPoint")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "radarPoint")
    .attr("cx", (d, i) => {
      const weight = window.axisWeights[d.axis] || 1;
      const level = Math.ceil((weight / 10) * 10);
      return radialScale(level * 1) * Math.cos(angleSlice * i - Math.PI / 2);
    })
    .attr("cy", (d, i) => {
      const weight = window.axisWeights[d.axis] || 1;
      const level = Math.ceil((weight / 10) * 10);
      return radialScale(level * 1) * Math.sin(angleSlice * i - Math.PI / 2);
    })
    .attr("r", 4)
    .style("fill", "#0080ff")
    .style("stroke", "white")
    .style("stroke-width", 1);

  // Add tooltips
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  svg
    .selectAll(".dataPoint")
    .on("mouseover", function (event, d) {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(
          `${d.axis}<br/>Value: ${d.value}<br/>Weight: ${
            window.axisWeights[d.axis] || 1
          }x`
        )
        .style("left", event.pageX + 5 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", function () {
      tooltip.transition().duration(500).style("opacity", 0);
    });
}

function showWeightControls(axisName, data, selector, position) {
  const weightControls = d3
    .select("body")
    .append("div")
    .attr("class", "weight-controls")
    .style("position", "absolute")
    .style("left", position.x + "px")
    .style("top", position.y - 5 + "px")
    .style("transform", "translate(-50%, -100%)")
    .style("background", "white")
    .style("padding", "15px")
    .style("border", "1px solid #ccc")
    .style("border-radius", "8px")
    .style("box-shadow", "0 2px 8px rgba(0,0,0,0.15)")
    .style("font-size", "14px")
    .style("min-width", "200px");

  weightControls
    .append("h3")
    .text(`Set weight for ${axisName}`)
    .style("margin", "0 0 12px 0")
    .style("font-size", "16px")
    .style("color", "#333")
    .style("font-weight", "600");

  const weights = [2, 4, 6, 8, 10];

  const buttonContainer = weightControls
    .append("div")
    .style("display", "flex")
    .style("gap", "8px")
    .style("margin-bottom", "12px");

  weights.forEach((weight) => {
    buttonContainer
      .append("button")
      .attr("class", "weight-button")
      .text(weight)
      .style("padding", "6px 12px")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("background", "#f5f5f5")
      .style("cursor", "pointer")
      .style("transition", "all 0.2s ease")
      .style("flex", "1")
      .style("min-width", "45px")
      .on("mouseover", function () {
        d3.select(this).style("background", "#e0e0e0");
      })
      .on("mouseout", function () {
        d3.select(this).style("background", "#f5f5f5");
      })
      .on("click", function () {
        window.axisWeights[axisName] = weight;

        // Redraw the current chart to update polygon
        drawRadarChart(data, selector);

        // Update overall performance player stats
        updateDashboard();

        weightControls.remove();
      });
  });

  const actionContainer = weightControls
    .append("div")
    .style("display", "flex")
    .style("gap", "8px")
    .style("margin-top", "8px");

  // Add Reset Weight button
  actionContainer
    .append("button")
    .attr("class", "weight-button")
    .text("Reset Weight")
    .style("padding", "6px 12px")
    .style("border", "1px solid #ddd")
    .style("border-radius", "4px")
    .style("background", "#fff")
    .style("cursor", "pointer")
    .style("flex", "1")
    .style("transition", "all 0.2s ease")
    .on("mouseover", function () {
      d3.select(this).style("background", "#f5f5f5");
    })
    .on("mouseout", function () {
      d3.select(this).style("background", "#fff");
    })
    .on("click", function () {
      delete window.axisWeights[axisName];

      // Update both the individual chart and overall performance
      updateDashboard();

      weightControls.remove();
    });

  actionContainer
    .append("button")
    .attr("class", "weight-button")
    .text("Close")
    .style("padding", "6px 12px")
    .style("border", "1px solid #ddd")
    .style("border-radius", "4px")
    .style("background", "#fff")
    .style("cursor", "pointer")
    .style("flex", "1")
    .style("transition", "all 0.2s ease")
    .on("mouseover", function () {
      d3.select(this).style("background", "#f5f5f5");
    })
    .on("mouseout", function () {
      d3.select(this).style("background", "#fff");
    })
    .on("click", function () {
      weightControls.remove();
    });
}
