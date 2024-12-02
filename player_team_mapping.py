from collections import defaultdict
import json
import math
import numpy as np
import os
import csv
import requests
import pandas as pd


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
    competition_id = "72"
    seasor_id = "107"

    output_directory = f"./Data/{competition_id}/{seasor_id}/player_mapping"
    os.makedirs(output_directory, exist_ok=True)

torunament_data = load_tournament_data(f'https://raw.githubusercontent.com/ameya-shahu/dv-project-filtered-data/refs/heads/main/competitions/{competition_id}/{seasor_id}/{seasor_id}.json')

for tdata in torunament_data:
    match_id = tdata["match_id"]

    events = load_tournament_data(f'https://raw.githubusercontent.com/ameya-shahu/dv-project-filtered-data/refs/heads/main/competitions/{competition_id}/{seasor_id}/matches/{match_id}.json')

    match_stats_url = f'https://raw.githubusercontent.com/aprajitabhowal/SoccerViz/refs/heads/main/Data/{competition_id}/{seasor_id}/match_stats_{match_id}.csv'

    csv_data = pd.read_csv(match_stats_url)

    player_teams = {}

    for player_id in csv_data.get('player_id', []):  # Check if 'player_id' exists
        matching_event = next((event for event in events if event.get("player", {}).get("id") == player_id), None)
        if matching_event:
            team_name = matching_event.get("possession_team", {}).get("name", None)
            if team_name:
                # Map player_id to the corresponding team name
                player_teams[player_id] = team_name
        else:
            # If no matching event is found, set team as None
            player_teams[player_id] = None

    output_file = os.path.join(output_directory, f"player_mapping_{match_id}.json")
    with open(output_file, 'w') as json_file:
        json.dump(player_teams, json_file, indent=4)
        
    print(f"Player mapping for match ID {match_id} saved to {output_file}")
    
    