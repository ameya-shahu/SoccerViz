function drawLineChart(scores, matchDetails) {
    const svg = d3.select("#lineChart");
    svg.selectAll("*").remove(); 
  
    const width = +svg.attr("width");
    const height = +svg.attr("height");
    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
  
    const chart = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
  
    const tooltip = d3
      .select("#lineChartTooltip")
      .style("position", "absolute")
      .style("display", "none")
      .style("background", "lightgray")
      .style("padding", "5px")
      .style("border-radius", "3px");
  
    const playerScores = scores.map((d) => parseFloat(d.matchScore));
    const matchNames = matchDetails.map((d) => d.matchName);
    // X-scale: Match names
    const xScale = d3
      .scalePoint()
      .domain(matchNames)
      .range([0, chartWidth])
      .padding(0.5);
  
    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(playerScores)]) 
      .nice() 
      .range([chartHeight, 0]);
  
    chart
      .append("g")
      .attr("transform", `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("transform", "rotate(-10)")
      .style("text-anchor", "end");
  
    chart.append("g").call(d3.axisLeft(yScale));
  
    const line = d3
      .line()
      .x((d, i) => xScale(matchNames[i]))
      .y((d) => yScale(d));
  
    chart
      .append("path")
      .datum(playerScores)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", line);
  
    chart
      .selectAll("circle")
      .data(playerScores)
      .enter()
      .append("circle")
      .attr("cx", (d, i) => xScale(matchNames[i]))
      .attr("cy", (d) => yScale(d))
      .attr("r", 5)
      .attr("fill", "orange")
      .on("mouseover", function (event, d) {
        tooltip
          .style("display", "block")
          .html(`Score: ${d.toFixed(2)}`)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 20 + "px");
        d3.select(this).attr("r", 7);
      })
      .on("mouseout", function () {
        tooltip.style("display", "none");
        d3.select(this).attr("r", 5);
      });
  
    svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height ) 
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .attr("font-weight", "bold")
    .text("Matches");
  
  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 15) 
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .attr("font-weight", "bold")
    .text("Score");
  
  }
    
   