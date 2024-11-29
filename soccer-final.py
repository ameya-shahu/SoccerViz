from collections import defaultdict
import json
import math
import numpy as np
import os
import csv
import requests

# Function to load data
def load_data(events_url, threesixty_url):
    try:
        # Fetch events data from the URL
        events_response = requests.get(events_url)
        events_response.raise_for_status()  # Raise an exception for HTTP errors
        events = events_response.json()
        
        # Fetch three-sixty data from the URL
        threesixty_response = requests.get(threesixty_url)
        threesixty_response.raise_for_status()
        threesixty = threesixty_response.json()
        
        return events, threesixty
    
    except requests.exceptions.RequestException as e:
        #print(f"Error fetching data from URL: {e}")
        return None, None
    except json.JSONDecodeError as e:
        #print(f"Error decoding JSON: {e}")
        return None, None

# Function to calculate overall pressure by player
def calculate_overall_pressure_by_player(events, threesixty, event_type):
    """
    Calculate the overall pressure for each player during 'Pass' events.
    """
    player_pressure = {}
    eventwise_pressure_rating = []
    # Filter for pass events
    pass_events = [event for event in events if event['type']['name'] == event_type]
    # Process each pass event
    for event in pass_events:
        player_id = event.get("player", {}).get("id") 
        player_name = event.get("player", {}).get("name") # Get the player ID
        if not player_id:
            continue  # Skip events with no player ID

        # Get the player and opponent locations for the event
        player_location = event.get("location")
        event_data = event.get(event_type.lower(), {})
        receiver_location = event_data.get("end_location")
        event_uuid = event.get("id")
        opponent_data = next((entry for entry in threesixty if entry['event_uuid'] == event_uuid), None)
        
        opponent_locations = []
        if opponent_data:
            opponent_locations = [
                frame['location'] for frame in opponent_data['freeze_frame'] if not frame['teammate']
            ]
        if event_type == 'Pass':
                receiver_x, receiver_y = receiver_location
        elif event_type == 'Shot':
                if isinstance(receiver_location, (list, tuple)) and len(receiver_location) == 2:
                    receiver_x, receiver_y = receiver_location
                else:
                    # Handle the case where receiver_location is not in the expected format
                    #print(f"Warning: Invalid receiver_location format for event {event.get('id')}: {receiver_location}")
                    receiver_x, receiver_y,receiver_z = receiver_location  # Or handle it however you prefer
        elif event_type == 'Duel':
                receiver_location = player_location
                receiver_x, receiver_y = receiver_location
        # Analyze opponent positions
        analyzed_positions = []
        if player_location and receiver_location:
            player_x, player_y = player_location

            player_direction = "downward" if player_y > receiver_y else "upward" if player_y < receiver_y else \
                               "left" if player_x > receiver_x else "right"

            for opponent_location in opponent_locations:
                opponent_x, opponent_y = opponent_location

                if player_x == opponent_x:
                    if player_direction == "upward":
                        position_relative_to_player = "front" if player_y < opponent_y else "back"
                    else:  # downward
                        position_relative_to_player = "front" if player_y > opponent_y else "back"
                else:
                    if player_direction == "left":
                        position_relative_to_player = "front" if player_x > opponent_x else "back"
                    else:  # right
                        position_relative_to_player = "front" if player_x < opponent_x else "back"

                analyzed_positions.append({
                    "opponentLocation": opponent_location,
                    "positionRelativeToPlayer": position_relative_to_player
                })

        # Calculate pressure for the current event
        if event_type == 'Pass' or 'Shot':
            FRONT_RADIUS = 9
            BACK_RADIUS = 3
        elif event_type == 'Duel':
            FRONT_RADIUS = 9
            BACK_RADIUS = 9
        total_pressure = 0

        for analyzed_position in analyzed_positions:
            opponent_x, opponent_y = analyzed_position["opponentLocation"]
            distance = math.sqrt((player_location[0] - opponent_x) ** 2 + (player_location[1] - opponent_y) ** 2)
            is_in_front = analyzed_position["positionRelativeToPlayer"] == "front"

            if is_in_front:
                radius = FRONT_RADIUS
            else:
                radius = BACK_RADIUS

            pressure = (((distance ** 2) - (2 * radius * distance) + (radius ** 2)) /
                        ((2 * (distance ** 2)) - (2 * radius * distance) + (radius ** 2)))
            total_pressure += pressure

        # Add the pressure to the player's cumulative pressure
        if player_id not in player_pressure:
            player_pressure[player_name] = {
                'player_id': player_id,
                'total_pressure': total_pressure
            }

        eventwise_pressure_rating.append({
            "event_id": event["id"],
            "pressure_rating": total_pressure,
            'player_id': player_id
        })
        


        # player_pressure[player_id] += total_pressure
    #print("eventwise rating ----")
    #print(eventwise_rating)
    return player_pressure, eventwise_pressure_rating

def calculate_pressure_change_by_player(events, threesixty, event_type):
    """
    Calculate the change in pressure for each player during 'Pass' events.
    The change in pressure is the difference between the pressure on the passer and the receiver.
    """
    player_pressure_change = {}
    eventwise_pressure_change = []

    # Get overall pressure for each player first
    player_pressure, _ = calculate_overall_pressure_by_player(events, threesixty, event_type)
    pass_events = [event for event in events if event['type']['name'] == event_type]
    
    # Process each pass event
    for event in pass_events:
        player_id = event.get("player", {}).get("id") 
        player_name = event.get("player", {}).get("name") # Get the player ID
        if not player_id:
            continue  # Skip events with no player ID

        # Get the player and opponent locations for the event
        player_location = event.get("location")
        event_data = event.get(event_type.lower(), {})
        receiver_location = event_data.get("end_location")
        event_uuid = event.get("id")
        opponent_data = next((entry for entry in threesixty if entry['event_uuid'] == event_uuid), None)
        
        opponent_locations = []
        if opponent_data:
            opponent_locations = [
                frame['location'] for frame in opponent_data['freeze_frame'] if not frame['teammate']
            ]

        # Calculate pressure for the passer
        total_passer_pressure = player_pressure.get(player_name, {}).get('total_pressure', 0)

        # Calculate pressure for the receiver
        receiver_x, receiver_y = receiver_location
        receiver_name = event_data.get("recipient", {}).get("name") 
        receiver_pressure = player_pressure.get(receiver_name, {}).get('total_pressure', 0)

        # Calculate the pressure change (difference)
        pressure_change = abs(total_passer_pressure - receiver_pressure)
        pressures = [player['total_pressure'] for player in player_pressure.values()]  
        elbow_point = find_elbow_point([p['total_pressure'] for p in player_pressure.values()])

        if elbow_point == 0:
            elbow_point = 1

        # Rescale the pressure change in the same way we rescaled pressures
        if pressure_change <= elbow_point:
            rescaled_pressure_change = (pressure_change / elbow_point) * 5
        else:
            rescaled_pressure_change = 5 + ((pressure_change - elbow_point) / (max(pressures) - elbow_point)) * 5
        
        # Round the rescaled pressure change to 2 decimal places
        rescaled_pressure_change = round(rescaled_pressure_change, 2)

        # Store the rescaled pressure change in the player_pressure_change dictionary
        if player_id not in player_pressure_change:
            player_pressure_change[player_name] = {
                'player_id': player_id,
                'rescaled_pressure_change': rescaled_pressure_change
            }
        
        eventwise_pressure_change.append({
            'player_id': player_id,
            "event_id": event["id"],
            'rescaled_pressure_change': rescaled_pressure_change
        })
        
    return player_pressure_change, eventwise_pressure_change

def find_elbow_point(pressures):
    """
    Find the elbow point where the gradient of the pressure distribution sharply increases.
    """
    if len(pressures) < 2:
        # Return the only pressure value or default to 0
        return pressures[0] if pressures else 0
    
    # Sort the pressures and compute the first and second derivative (gradient change)
    sorted_pressures = sorted(pressures)
    first_derivative = np.diff(sorted_pressures)
    second_derivative = np.diff(first_derivative)

    if len(second_derivative) == 0:
        return sorted_pressures[0]  # Default to the first element if no elbow can be determined

    # Find the index of the maximum second derivative, which indicates the elbow
    elbow_index = np.argmax(second_derivative) + 1  # +1 because diff reduces length by 1

    return sorted_pressures[elbow_index]

def scale_value(value, elbow_point, max_value):
    """
    Scales a value between 0-9 if it's less than the elbow point,
    or between 9-10 if it's greater than or equal to the elbow point.
    
    Parameters:
        value (float): The input value to scale.
        elbow_point (float): The threshold dividing the two ranges.

    Returns:
        float: The scaled value.
    """
    if value < elbow_point:
        # Scale value between 0 to 9
        scaled_value = (value / elbow_point) * 9
    else:
        # Scale value between 9 to 10
        # #print("Higher than elbow ---", value)
        scaled_value = 9 + ((value - elbow_point) / (max_value - elbow_point))
        # #print("Higher than elbow scaled ---", scaled_value)
    
    return scaled_value

# Function to rescale the pressure values based on the elbow point
def rescale_pressures(player_pressures):
    """
    Rescale player pressures using a piecewise linear mapping to a 0-10 scale.
    """
    # Get all pressures
    pressures = list(player_pressures.values())
    # Find the elbow point
    elbow_point = find_elbow_point(pressures)
    if elbow_point == 0:
        #print("Warning: Elbow point is zero. Using a default value instead.")
        elbow_point = 1  # You can adjust this value to a sensible default based on your use case.
    #print(f"Elbow point pressure value: {elbow_point}")

    # Rescale pressures based on the elbow point
    rescaled_pressures = {}
    for player_id, pressure in player_pressures.items():
        if pressure <= elbow_point:
            # Rescale to range [0, 5] for pressures below or equal to the elbow point
            rescaled_pressure = (pressure / elbow_point) * 5
        else:
            # Rescale to range [5, 10] for pressures above the elbow point
            rescaled_pressure = 5 + ((pressure - elbow_point) / (max(pressures) - elbow_point)) * 5
        
        # Store the rescaled pressure
        rescaled_pressures[player_id] = round(rescaled_pressure, 2)

    return rescaled_pressures

# FUNCTION TO MAP MATCHES AND PLAYERS INFO
def organize_data_by_match_and_player(match_id, match_data, player_positions_data):
    player_stats = {}
    event_data = {}
    
    # First store ALL events in event_data
    for event in match_data:
        event_data[event['id']] = event
        
        # Then organize passes by player
        if event['type']['name'] in ['Pass', 'Duel', 'Shot']:
            player_id = event['player']['id']
            player_name = event['player']['name']
            
            if match_id not in player_stats:
                player_stats[match_id] = {}
            if player_id not in player_stats[match_id]:
                player_stats[match_id][player_id] = {
                    'name': player_name,
                    'passes': [],
                    'duels': [],
                    'shots': [],
                    'packing_values': [],
                    'passes_until_shot_pass': [],
                    'passes_until_shot_duel': [],
                    'area_ratings': [],
                    'duel_area_ratings': [],
                    'shot_accuracy_ratings': [],
                    'expected_goal_ratings': []
                }
            
            if event['type']['name'] == 'Pass':
                player_stats[match_id][player_id]['passes'].append(event)
            elif event['type']['name'] == 'Duel':
                player_stats[match_id][player_id]['duels'].append(event)
            else:
                player_stats[match_id][player_id]['shots'].append(event)
    
    return player_stats, event_data

# HELPER FUNCTIONS TO CALCULATE AREA
def is_point_in_rectangle(x, y, x1, y1, x2, y2):
    return min(x1, x2) <= x <= max(x1, x2) and min(y1, y2) <= y <= max(y1, y2)


def create_zone_weights():
    return {
        (0,0): 2.0,  # Bottom left
        (0,1): 3.0,  # Middle left
        (0,2): 2.5,  # Top left
        (1,0): 3.5,  # Bottom left-center
        (1,1): 5.0,  # Middle left-center
        (1,2): 4.0,  # Top left-center
        (2,0): 5.0,  # Bottom right-center
        (2,1): 7.0,  # Middle right-center
        (2,2): 6.0,  # Top right-center
        (3,0): 6.5,  # Bottom right
        (3,1): 8.0,  # Middle right
        (3,2): 7.0   # Top right
    }

def get_zone(x, y):
    """Determine which zone a point belongs to based on x,y coordinates"""
    # X zones (0-3 from left to right)
    x_zone = int(min(3, x * 4 / 120))
    
    # Y zones (0-2 from bottom to top)
    y_zone = int(min(2, y * 3 / 80))
    
    return (x_zone, y_zone)

def calculate_line_zone_intersection(start, end):
    """Calculate the length of pass segments in each zone"""
    x1, y1 = start
    x2, y2 = end
    
    # Convert to numpy arrays for easier calculation
    start_point = np.array([x1, y1])
    end_point = np.array([x2, y2])
    
    # Calculate total pass length
    total_length = np.linalg.norm(end_point - start_point)
    
    # Get zones for start and end points
    start_zone = get_zone(x1, y1)
    end_zone = get_zone(x2, y2)
    
    if start_zone == end_zone:
        return {start_zone: total_length}
    
    # For simplicity, we'll split the length proportionally between zones
    # In a full implementation, you'd need to calculate actual intersections
    zone_lengths = {}
    num_zones = abs(end_zone[0] - start_zone[0]) + abs(end_zone[1] - start_zone[1]) + 1
    length_per_zone = total_length / num_zones
    
    current_zone = start_zone
    while current_zone != end_zone:
        zone_lengths[current_zone] = length_per_zone
        
        # Move to next zone
        if current_zone[0] < end_zone[0]:
            current_zone = (current_zone[0] + 1, current_zone[1])
        elif current_zone[1] < end_zone[1]:
            current_zone = (current_zone[0], current_zone[1] + 1)
        elif current_zone[1] > end_zone[1]:
            current_zone = (current_zone[0], current_zone[1] - 1)
    
    zone_lengths[end_zone] = length_per_zone
    return zone_lengths

# FUNCTION TO CALCULATE AREA
def calculate_area_score(pass_event):
    """Calculate the area score Ap for a pass"""
    # Get start and end locations
    start_loc = pass_event['location']
    end_loc = pass_event['pass']['end_location']
    
    # Only consider forward passes ending in opponent's half
    if end_loc[0] <= 60 or end_loc[0] <= start_loc[0]:
        return 0
    
    # Get zone weights
    weights = create_zone_weights()
    
    # Calculate lengths in each zone
    zone_lengths = calculate_line_zone_intersection(start_loc, end_loc)
    
    # Calculate area score using the formula
    Ap = 0
    for zone, length in zone_lengths.items():
        zone_width = 30 if zone[0] in [1,2] else 20  # Adjust based on your pitch dimensions
        Ap += weights[zone] * (length / zone_width)
    
    return Ap

# FUNCTION TO CALCULATE AREA FOR DUEL EVENT
def calculate_duel_area(duel_event):
    """Calculate the area rating Ad for a duel"""
    # Get duel location

    x, y = duel_event['location']
    # Get pitch dimensions
    lx = 120  # pitch length
    ly = 80   # pitch width
    
    # Calculate relative positions from center
    x_rel = abs(x - lx/2)
    y_rel = abs(y - ly/2)
    
    # Calculate area rating using the formula
    Ad = (abs(x_rel - lx/2) / (lx/2)) * (1 - abs(y_rel - ly/2) / (ly/2))
    return Ad

def calculate_duel_success_probability(pressure, duel_area):
    """Calculate expected duel success probability using logistic regression"""
    # Constants
    beta0 = -0.3979
    beta1 = 0.2535
    beta2 = -0.9662
    
    # Calculate exponent
    exponent = -(beta0 + beta1 * pressure + beta2 * duel_area)
    
    # Calculate probability using logistic function
    probability = 1 / (1 + np.exp(exponent))
    
    return (1 - probability)

# FUNCTION TO CALCULATE SHOT ACCURACY
def calculate_shot_accuracy(shot_event):
    """Calculate accuracy score for a shot based on location and outcome"""
    # Get shot location
    x, y = shot_event['location']
    
    # Get shot outcome
    outcome = shot_event.get('shot', {}).get('outcome', {}).get('name', '')
    
    # Base score calculation based on distance from goal center
    # Assuming goal is at x=120 and centered at y=40
    goal_x, goal_y = 120, 40
    goal_height = 2.44  # Standard goal height in meters
    goal_width = 7.32   # Standard goal width in meters
    
    # Calculate distance from goal center
    distance_to_goal = np.sqrt((x - goal_x)**2 + (y - goal_y)**2)
    
    # Calculate angle from center (to determine if shot is towards corners)
    y_diff = abs(y - goal_y)
    corner_factor = min(1, y_diff / (goal_width/2))  # Higher for shots towards posts
    
    # Base accuracy score (0-10 scale)
    base_score = max(0, 10 - (distance_to_goal / 10))
    
    # Adjust score based on outcome
    if outcome == 'Goal':
        # Bonus for goals, especially those towards corners
        accuracy_score = base_score * (1.5 + 0.5 * corner_factor)
    elif outcome == 'Saved':
        # Reduced score for saved shots, but maintain corner bonus
        accuracy_score = base_score * (0.7 + 0.3 * corner_factor)
    elif outcome == 'Off T':
        # Significant penalty for off-target shots
        accuracy_score = base_score * 0.3
    else:
        # Default case (blocked, missed, etc.)
        accuracy_score = base_score * 0.5
    
    return min(10, accuracy_score)  # Cap at 10

# HELPER FUNCTIONS TO CALCULATE EXPECTED GOAL SUCCESS PROBABILITY
def calculate_goal_angle(shot_location, goal_posts):
    """Calculate angle between shot location and goal posts"""
    x, y = shot_location
    left_post = np.array([120, 36.34])   # Goal post coordinates
    right_post = np.array([120, 43.66])
    
    v1 = left_post - np.array([x, y])
    v2 = right_post - np.array([x, y])
    
    # Calculate angle in radians
    cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
    angle = np.arccos(np.clip(cos_angle, -1.0, 1.0))
    
    return angle

def count_opponents_in_triangle(shot_location, player_positions):
    """Count opponents between shooter and goal"""
    x, y = shot_location
    left_post = np.array([120, 36.34])
    right_post = np.array([120, 43.66])
    
    count = 0
    for player in player_positions:
        px, py = player['location']
        point = np.array([px, py])
        
        # Check if point is in triangle
        A = np.array([[left_post[0]-x, right_post[0]-x],
                     [left_post[1]-y, right_post[1]-y]])
        b = np.array([px-x, py-y])
        
        try:
            s, t = np.linalg.solve(A, b)
            if s >= 0 and t >= 0 and s + t <= 1:
                count += 1
        except np.linalg.LinAlgError:
            continue
            
    return count

def calculate_pressure_variables(shot_location, player_positions):
    """Calculate pressure variables for two distance ranges"""
    x, y = shot_location
    pressure_1m = 0
    pressure_2m = 0
    
    for player in player_positions:
        px, py = player['location']
        distance = np.sqrt((px-x)**2 + (py-y)**2)
        
        if distance <= 1:
            pressure_1m += 1
        elif 1 < distance <= 2:
            pressure_2m += 1
    
    return pressure_1m, pressure_2m

def calculate_expected_goal_success(shot_event, player_positions):
    """Calculate expected goal success probability"""
    # Constants
    beta0 = 0.9841
    beta1 = 1.2846  # angle
    beta2 = 0.0671  # distance
    beta3 = 0.3240  # opponents
    beta4 = 0.5887  # pressure 1m
    beta5 = 0.3330  # pressure 1-2m
    
    shot_location = shot_event['location']
    goal_center = np.array([120, 40])
    
    # Calculate variables
    angle = calculate_goal_angle(shot_location, goal_center)
    distance = np.linalg.norm(np.array(shot_location) - goal_center)
    opponents = count_opponents_in_triangle(shot_location, player_positions)
    pressure_1m, pressure_2m = calculate_pressure_variables(shot_location, player_positions)
    
    # Calculate exponent
    exponent = -(beta0 + beta1*angle + beta2*distance + beta3*opponents + 
                beta4*pressure_1m + beta5*pressure_2m)
    
    # Calculate base probability
    base_prob = 1 / (1 + np.exp(exponent))
    
    # Adjust score based on outcome
    outcome = shot_event.get('shot', {}).get('outcome', {}).get('name', '')
    
    if outcome == 'Goal':
        # Map to 9-10 range for goals
        final_score = 9 + base_prob
    else:
        # Calculate distance to pitch boundary
        ds = np.sqrt((120 - shot_location[0])**2 + (40 - shot_location[1])**2)
        distance_factor = distance / ds
        
        if outcome == 'Off T':
            # Half score for off-target shots
            final_score = 5 * base_prob * distance_factor
        else:
            # Normal weighting for other outcomes
            final_score = 10 * base_prob * distance_factor
    
    return min(10, final_score)

# FUNCTION TO CALCULATE PACKING
def calculate_packing(pass_event, player_positions):
    start_x, start_y = pass_event['location']
    end_x, end_y = pass_event['pass']['end_location']
    
    players_packed = 0
    for player in player_positions:
        x, y = player['location']
        if is_point_in_rectangle(x, y, start_x, start_y, end_x, end_y):
            players_packed += 1
    
    return players_packed

# FUNCTION TO CALCULATE PASSES UNTIL SHOT
def calculate_passes_until_shot_pass(events, event_data):
    pass_ratings = {}
    shot_found = False
    passes_since_last_shot = 0

    eventwise_pass_until_shot  = []
    
    # # Sort events by timestamp if available
    # events = sorted(events, key=lambda x: x.get('timestamp', 0), reverse=True)
    
    for event in reversed(events):
        event_type = event['type']['name']

        if event_type == 'Shot':
            shot_found = True
            passes_since_last_shot = 0
        elif event_type == 'Pass':
            if shot_found:
                rating = max(10 - passes_since_last_shot, 0)
                pass_ratings[event['id']] = rating
                eventwise_pass_until_shot.append({
                    "event_id": event["id"],
                    "pass_until_shot": rating,
                    'player_id': event["player"]["id"]
                })
                passes_since_last_shot += 1
            else:
                pass_ratings[event['id']] = 0
                eventwise_pass_until_shot.append({
                    "event_id": event["id"],
                    "pass_until_shot": 0,
                    'player_id': event["player"]["id"]
                })
        
        if passes_since_last_shot >= 10:
            shot_found = False

    return pass_ratings, eventwise_pass_until_shot

# FUNCTION TO CALCULATE PASSES UNTIL SHOT
def calculate_passes_until_shot_duel(events, event_data):
    pass_ratings = {}
    shot_found = False
    passes_since_last_shot = 0
    eventwise_pass_until_shot = []

    
    
    # # Sort events by timestamp if available
    # events = sorted(events, key=lambda x: x.get('timestamp', 0), reverse=True)
    
    for event in reversed(events):
        event_type = event['type']['name']

        if event_type == 'Shot':
            shot_found = True
            passes_since_last_shot = 0
        elif event_type == 'Duel':
            if shot_found:
                rating = max(10 - passes_since_last_shot, 0)
                pass_ratings[event['id']] = rating
                passes_since_last_shot += 1
                eventwise_pass_until_shot.append({
                    "event_id": event["id"],
                    "pass_until_shot": rating,
                    'player_id': event["player"]["id"]
                })
            else:
                pass_ratings[event['id']] = 0
                eventwise_pass_until_shot.append({
                    "event_id": event["id"],
                    "pass_until_shot": 0,
                    'player_id': event["player"]["id"]
                })
        
        if passes_since_last_shot >= 10:
            shot_found = False

    return pass_ratings, eventwise_pass_until_shot

def calculate_pass_success(pass_length, packing_value, area_rating, pressure_sum, 
                            beta_1, beta_2, beta_3, beta_4):
    # Logistic regression equation
    logit =  beta_2 * packing_value + beta_1 * pass_length + beta_4 * area_rating + beta_3 * pressure_sum
    pass_success_prob = 1 / (1 + math.exp(-logit))  # Sigmoid function
    return 1-pass_success_prob


# FUNCTION TO CALCULATE ALL METRICS PLAYER-WISE
def calculate_metrics_for_player(player_data, event_data, player_positions_data, player_id):

    eventwise_area_score = []
    for pass_event in player_data['passes']:
        # Calculate packing
        player_positions = next((event['freeze_frame'] for event in player_positions_data 
                               if event['event_uuid'] == pass_event['id']), [])
        if player_positions:
            packing = calculate_packing(pass_event, player_positions)
            player_data['packing_values'].append(packing)
        
        # Calculate area rating
        area_score = calculate_area_score(pass_event)

        if area_score > 0:
            player_data['area_ratings'].append(area_score)

            eventwise_area_score.append({
                "event_id": pass_event["id"],
                "area_score": area_score,
                'player_id': player_id
            })

            
    # Calculate duel area ratings
    for duel_event in player_data['duels']:
        area_score = calculate_duel_area(duel_event)

        if area_score > 0:
            player_data['duel_area_ratings'].append(area_score)

            eventwise_area_score.append({
                "event_id": duel_event["id"],
                "area_score": area_score,
                'player_id': player_id
            })

    # Add shot accuracy calculations
    for shot_event in player_data['shots']:
        accuracy_score = calculate_shot_accuracy(shot_event)
        player_data['shot_accuracy_ratings'].append(accuracy_score)
        player_positions = next((event['freeze_frame'] for event in player_positions_data 
                                if event['event_uuid'] == shot_event['id']), [])
        if player_positions:
            xg_score = calculate_expected_goal_success(shot_event, player_positions)
            player_data['expected_goal_ratings'].append(xg_score)
    
    # Get all match events in chronological order
    all_match_events = list(event_data.values())
    all_match_events.sort(key=lambda x: x.get('timestamp', 0))
    
    # Calculate passes until shot using all events
    pass_ratings_pass, eventwise_pass_until_shot = calculate_passes_until_shot_pass(all_match_events, event_data)
    
    # Only store ratings for this player's passes
    for pass_event in player_data['passes']:
        if pass_event['id'] in pass_ratings_pass:
            player_data['passes_until_shot_pass'].append(pass_ratings_pass[pass_event['id']])

    # Calculate passes until shot using all events
    pass_ratings_duels, eventwise_pass_until_shot_duel = calculate_passes_until_shot_duel(all_match_events, event_data)
    
    # Only store ratings for this player's passes
    for pass_event in player_data['duels']:
        if pass_event['id'] in pass_ratings_duels:
            player_data['passes_until_shot_duel'].append(pass_ratings_duels[pass_event['id']])

    # Calculate averages
    # player_data['avg_packing'] = np.mean(player_data['packing_values']) if player_data['packing_values'] else 0
    player_data['avg_passes_until_shot_pass'] = np.mean(player_data['passes_until_shot_pass']) if player_data['passes_until_shot_pass'] else 0
    player_data['avg_passes_until_shot_duel'] = np.mean(player_data['passes_until_shot_duel']) if player_data['passes_until_shot_duel'] else 0
    #player_data['avg_area_rating'] = np.mean(player_data['area_ratings']) if player_data['area_ratings'] else 0
    #player_data['avg_duel_area_rating'] = np.mean(player_data['duel_area_ratings']) if player_data['duel_area_ratings'] else 0
    player_data['avg_shot_accuracy'] = np.mean(player_data['shot_accuracy_ratings']) if player_data['shot_accuracy_ratings'] else 0
    player_data['avg_expected_goals'] = np.mean(player_data['expected_goal_ratings']) if player_data['expected_goal_ratings'] else 0

    return eventwise_area_score, eventwise_pass_until_shot, eventwise_pass_until_shot_duel

def scale_area_rating():
    overall_area_ratings = []
    for player_id, player_data in player_stats[match_id].items():
        overall_area_ratings += player_data["area_ratings"]

    elbow_value = find_elbow_point(overall_area_ratings)
    max_area_rating = max(overall_area_ratings)

    for player_id, player_data in player_stats[match_id].items():
        updated_ratings = []

        for rating in player_data["area_ratings"]:
            updated_ratings.append(
                scale_value(rating, elbow_value, max_area_rating)
            )
        
        
        player_data['area_ratings'] = updated_ratings

        ##########################

        # updated_duel_area_ratings = []

        # for rating in player_data["duel_area_ratings"]:
        #     updated_ratings.append(
        #         scale_value(rating, elbow_value)
        #     )
        
        # player_data['duel_area_ratings'] = updated_duel_area_ratings

        player_data['avg_area_rating'] = np.mean(player_data['area_ratings']) if player_data['area_ratings'] else 0
        player_data['avg_duel_area_rating'] = np.mean(player_data['duel_area_ratings']) if player_data['duel_area_ratings'] else 0

def scale_packing():
    overall_packing = []
    for player_id, player_data in player_stats[match_id].items():
        overall_packing += player_data["packing_values"]
    #print(overall_packing)
    elbow_value = find_elbow_point(overall_packing)
    max_packing_value = max(overall_packing)
    

    for player_id, player_data in player_stats[match_id].items():
        updated_packing_values = []

        for rating in player_data["area_ratings"]:
            updated_packing_values.append(
                scale_value(rating, elbow_value, max_packing_value)
            )

        
        player_data['packing_values'] = updated_packing_values

        ##########################

        # updated_duel_area_ratings = []

        # for rating in player_data["duel_area_ratings"]:
        #     updated_ratings.append(
        #         scale_value(rating, elbow_value)
        #     )
        
        # player_data['duel_area_ratings'] = updated_duel_area_ratings

        player_data['avg_packing'] = np.mean(player_data['packing_values']) if player_data['packing_values'] else 0


def scale_eventwise_values(data, dataKeys, valKeys):
    arr = data[dataKeys]
    arr_values = [obj[valKeys] for obj in arr]
    elbow_point = find_elbow_point(arr_values)
    max_value = max(arr_values)
    arr = [
        {**obj, f'{valKeys}': scale_value(obj[valKeys], elbow_point, max_value)}
        for obj in arr
    ]

    return arr


def eventwise_datascaling(data):
    data["eventwise_area_score"] = scale_eventwise_values(data, "eventwise_area_score", "area_score")
    data["eventwise_pressure_rating"] = scale_eventwise_values(data, "eventwise_pressure_rating" ,"pressure_rating")
    return data
    
    
def load_tournament_data(url):
    try:
        # Fetch events data from the URL
        events_response = requests.get(url)
        events_response.raise_for_status()  # Raise an exception for HTTP errors
        events = events_response.json()
    
        
        return events
    
    except requests.exceptions.RequestException as e:
        #print(f"Error fetching data from URL: {e}")
        return None
    except json.JSONDecodeError as e:
        #print(f"Error decoding JSON: {e}")
        return None



if __name__ == "__main__":
    # Main script
    # match_id = "3788741"
    # match_id = "3857254"
    competition_id = "43"
    seasor_id = "106"

    output_directory = f"./Data/{competition_id}/{seasor_id}"
    os.makedirs(output_directory, exist_ok=True)


    torunament_data = load_tournament_data(f'https://raw.githubusercontent.com/ameya-shahu/dv-project-filtered-data/refs/heads/main/competitions/{competition_id}/{seasor_id}/{seasor_id}.json')
    matches = []
    for tdata in torunament_data:
        match_id = tdata["match_id"]  
        matches.append({
            "match_id": match_id,
            "home_team": tdata["home_team"]["home_team_name"],
            "home_team_id": tdata["home_team"]["home_team_id"],
            "away_team": tdata["away_team"]["away_team_name"],
            "away_team_id": tdata["away_team"]["away_team_id"]
        })
        events, threesixty = load_data(
            events_url=f'https://raw.githubusercontent.com/ameya-shahu/dv-project-filtered-data/refs/heads/main/competitions/{competition_id}/{seasor_id}/matches/{match_id}.json',
            threesixty_url=f'https://raw.githubusercontent.com/ameya-shahu/dv-project-filtered-data/refs/heads/main/competitions/{competition_id}/{seasor_id}/three-sixty/{match_id}.json'
        )

        if events and threesixty:
            player_pressure_pass, eventwise_pressure_rating = calculate_overall_pressure_by_player(events, threesixty,'Pass')
            player_pressures_pass = {player['player_id']: player['total_pressure'] for player in player_pressure_pass.values()}
            rescaled_pressures_pass = rescale_pressures(player_pressures_pass)

            player_pressure_duel, eventwise_duel_pressure_rating = calculate_overall_pressure_by_player(events, threesixty,'Duel')
            player_pressures_duels = {player['player_id']: player['total_pressure'] for player in player_pressure_duel.values()}
            rescaled_pressures_duels = rescale_pressures(player_pressures_duels)

            player_pressure_shot, eventwise_shot_pressure_rating = calculate_overall_pressure_by_player(events, threesixty,'Shot')
            player_pressures_shots = {player['player_id']: player['total_pressure'] for player in player_pressure_shot.values()}
            rescaled_pressures_shots = rescale_pressures(player_pressures_shots)

            all_match_stats = {}
            # #print("Total Pressures :", player_pressure)
            # #print("Rescaled Pressures (0-10 scale):", rescaled_pressures)
            rescaled_pressure_with_player_name_pass = {}
            rescaled_pressure_with_player_name_duel = {}
            rescaled_pressure_with_player_name_shot = {}

            # Iterate through the Total Pressures to match player names with rescaled pressures
            for player_name, player_data in player_pressure_pass.items():
                player_id = player_data['player_id']
                if player_id in rescaled_pressures_pass:
                    # Add player name along with the corresponding rescaled pressure
                    rescaled_pressure_with_player_name_pass[player_name] = {
                        'player_id': player_id,
                        'rescaled_pressure': round(rescaled_pressures_pass[player_id], 2)
                    }
            for player_name, player_data in player_pressure_duel.items():
                player_id = player_data['player_id']
                if player_id in rescaled_pressures_duels:
                    # Add player name along with the corresponding rescaled pressure
                    rescaled_pressure_with_player_name_duel[player_name] = {
                        'player_id': player_id,
                        'rescaled_pressure': round(rescaled_pressures_duels[player_id], 2)
                    }
            for player_name, player_data in player_pressure_shot.items():
                player_id = player_data['player_id']
                if player_id in rescaled_pressures_shots:
                    # Add player name along with the corresponding rescaled pressure
                    rescaled_pressure_with_player_name_shot[player_name] = {
                        'player_id': player_id,
                        'rescaled_pressure': round(rescaled_pressures_shots[player_id], 2)
                    }
            overplayed_pressure, eventwise_pressure_change = calculate_pressure_change_by_player(events,threesixty,'Pass')
            # #print(rescaled_pressure_with_player_name)
            
                
                # Organize data and get event_data once
            player_stats, event_data = organize_data_by_match_and_player(match_id, events, threesixty)
                
                # Calculate metrics for each player
            match_stats = {}
            eventwise_area_score = []
            eventwise_pass_until_shot = []
            eventwise_pass_until_shot_duel = []

            for player_id, player_data in player_stats[match_id].items():
                eventwise_area_score_pl, eventwise_pass_until_shot, eventwise_pass_until_shot_duel = calculate_metrics_for_player(player_data, event_data, threesixty, player_id)
                eventwise_area_score += eventwise_area_score_pl
            
            scale_area_rating()
            scale_packing()

            eventWiseData = {
                "eventwise_area_score" : eventwise_area_score,
                "eventwise_pass_until_shot": eventwise_pass_until_shot + eventwise_pass_until_shot_duel,
                "eventwise_pressure_change": eventwise_pressure_change,
                "eventwise_pressure_rating": eventwise_pressure_rating + eventwise_shot_pressure_rating + eventwise_duel_pressure_rating
            }

            # print(eventWiseData)

            
            final_eventwise_data = eventwise_datascaling(eventWiseData)

            merged_data = defaultdict(dict)
            
            for array in final_eventwise_data.values():
                for obj in array:
                    event_key = obj["event_id"]
                    merged_data[event_key].update(obj)

                
            merged_list = list(merged_data.values())

            for item in merged_list:
                matching_events = [event for event in events if event['id'] == item['event_id']]
                for event in matching_events:
                    event_type = event['type']['name']

                    # Add keys based on the type of event
                    if event_type in ['Duel', 'Shot']:
                        item['x_start'] = event['location'][0]
                        item['y_start'] = event['location'][1]
                        item['x_end'] = event['location'][0]
                        item['y_end'] = event['location'][1]
                    elif event_type == 'Pass':
                        item['x_start'] = event['location'][0]
                        item['y_start'] = event['location'][1]
                        item['x_end'] = event["pass"]['end_location'][0]
                        item['y_end'] = event["pass"]['end_location'][1]

                    # Copy timestamp
                    item['timestamp'] = event['timestamp']

             # #print(match_stats)
            

            output_file_path = os.path.join(output_directory, f"pcp_{match_id}.json")

            with open(output_file_path, "w") as json_file:
                json.dump(merged_list, json_file, indent=4)

            #print(final_eventwise_data)

            for player_id, player_data in player_stats[match_id].items():
                player_name = player_data['name']
                rescaled_pressure_pass = rescaled_pressure_with_player_name_pass.get(player_name, {}).get('rescaled_pressure', 0)
                rescaled_pressure_duel = rescaled_pressure_with_player_name_duel.get(player_name, {}).get('rescaled_pressure', 0)
                rescaled_pressure_shot = rescaled_pressure_with_player_name_shot.get(player_name, {}).get('rescaled_pressure', 0)
                expected_pass_success = calculate_pass_success(player_data['avg_passes_until_shot_pass'], player_data['avg_packing'],
                                                            player_data['avg_area_rating'], rescaled_pressure_pass, 
                                -0.0450, -0.1856, -0.9534, -0.1486)
                expected_duel_success = calculate_duel_success_probability(rescaled_pressure_duel, player_data['avg_duel_area_rating'])
                    # Store individual stats in a more structured way
                match_stats[player_data['name']] = {
                        'player_id': player_id,
                        'avg_packing': player_data['avg_packing'],
                        'avg_passes_until_shot_pass': player_data['avg_passes_until_shot_pass'],
                        'avg_passes_until_shot_duel': player_data['avg_passes_until_shot_duel'],
                        'avg_area_rating': player_data['avg_area_rating'],
                        'total_passes': len(player_data['passes']),
                        'total_duels': len(player_data['duels']),
                        'total_shots': len(player_data['shots']),
                        'avg_duel_area_rating': player_data['avg_duel_area_rating'],
                        'avg_shot_accuracy': player_data['avg_shot_accuracy'],
                        'avg_pressure_pass': rescaled_pressure_pass,
                        'overplayed_pressure': overplayed_pressure.get(player_name,{}).get('rescaled_pressure_change',0),
                        'avg_pressure_duel': rescaled_pressure_duel,
                        'avg_pressure_shot': rescaled_pressure_shot,
                        'expected_pass_success': expected_pass_success,
                        'expected_duel_success' : expected_duel_success,
                        'expected_goal_success': player_data['avg_expected_goals']
                    }
            
           
            output_file_path = os.path.join(output_directory, f"match_stats_{match_id}.csv")
            with open(output_file_path, mode="w", newline="", encoding='utf-8') as csv_file:
                writer = csv.writer(csv_file)
                # Write the header (keys of the first dictionary entry)
                headers = ["player_name"] + list(next(iter(match_stats.values())).keys())
                writer.writerow(headers)
                
                # Write the rows (player name and their stats)
                for player_name, stats in match_stats.items():
                    row = [player_name] + list(stats.values())
                    writer.writerow(row)

            print(f"File saved at: {output_file_path}")
            print(f'length of stats:{len(match_stats)}')
            #print("---")


    output_file_path = os.path.join(output_directory, f"01_matches_info.json")

    with open(output_file_path, "w") as json_file:
        json.dump(matches, json_file, indent=4)
