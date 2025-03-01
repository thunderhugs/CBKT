import numpy as np
import matplotlib.pyplot as plt
from typing import List, Dict, Optional
import matplotlib.font_manager as fm
from matplotlib.path import Path
import matplotlib.patches as patches
from matplotlib import transforms
import matplotlib.image as mpimg
import cairosvg
from PIL import Image
import io

# Add the custom font
fm.fontManager.addfont(r'/home/dan/Downloads/capture_it/Capture it.ttf')

# Load SVG markers
def load_svg_marker(filepath):
    """Load an SVG file and return it as a matplotlib image"""
    import cairosvg
    import io
    from PIL import Image
    import re
    
    # Read the SVG file
    with open(filepath, 'r') as f:
        svg_content = f.read()
    
    # Replace fill colors with black
    svg_content = re.sub(r'fill="[^"]*"', 'fill="black"', svg_content)
    
    # Convert SVG to PNG in memory with white background
    png_data = cairosvg.svg2png(bytestring=svg_content.encode('utf-8'))
    
    # Create PIL Image from PNG data
    image = Image.open(io.BytesIO(png_data))
    
    # Convert to RGBA if not already
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    # Make white pixels transparent
    data = np.array(image)
    white = (data[:, :, 0] > 250) & (data[:, :, 1] > 250) & (data[:, :, 2] > 250)
    data[white, 3] = 0
    
    return Image.fromarray(data)

class KillTeamLeague:
    def __init__(self, players: List[str], block_type: str = "Alpha"):
        # Load the marker images
        self.star_image = load_svg_marker('/home/dan/Documents/gitz/cbkt/assets/star.svg')
        self.skull_image = load_svg_marker('/home/dan/Documents/gitz/cbkt/assets/skull.svg')
        """
        Initialize the league with a list of players and block type.
        
        Args:
            players (List[str]): List of player names
            block_type (str): Either "Alpha" or "Bravo" to determine color scheme
        """
        """
        Initialize the league with a list of players and block type.
        
        Args:
            players (List[str]): List of player names
            block_type (str): Either "Alpha" or "Bravo" to determine color scheme
        """
        self.players = players
        self.num_players = len(players)
        self.block_type = block_type
        
        # Load the marker images
        self.star_image = load_svg_marker('/home/dan/Documents/gitz/cbkt/assets/star.svg')
        self.skull_image = load_svg_marker('/home/dan/Documents/gitz/cbkt/assets/skull.svg')
        # Initialize results matrix with None (no games played)
        self.results = np.full((self.num_players, self.num_players), None)
        self.scores = np.full((self.num_players, self.num_players), None)
        self.victory_points = np.full((self.num_players,), 0)
        
    def add_result(self, player1: str, player2: str, result: str, score: float = None):
        """
        Add a game result to the league.
        
        Args:
            player1 (str): Name of the first player
            player2 (str): Name of the second player
            result (str): 'W' for win, 'L' for loss, 'D' for draw
            score (float): Optional match score
        """
        if player1 not in self.players or player2 not in self.players:
            raise ValueError("Player not found in league")
            
        p1_idx = self.players.index(player1)
        p2_idx = self.players.index(player2)
        
        # Store result and score
        self.results[p1_idx, p2_idx] = result
        if score is not None:
            self.scores[p1_idx, p2_idx] = score

    def calculate_points(self, results_row) -> int:
        """Calculate points for a player based on their results."""
        points = 0
        for result in results_row:
            if result == 'W':
                points += 3  # 3 points for win
            elif result == 'D':
                points += 2  # 2 points for draw
            elif result == 'L':
                points += 1  # 1 point for loss
        return points

    def get_sorted_player_indices(self):
        """Return player indices sorted by points and then victory points."""
        player_data = []
        for i in range(self.num_players):
            points = self.calculate_points(self.results[i])
            vp = self.victory_points[i]
            player_data.append((i, points, vp))
        
        # Sort by points (descending), then by VP (descending)
        return [idx for idx, _, _ in sorted(player_data, 
                                          key=lambda x: (x[1], x[2]), 
                                          reverse=True)]
    
    def visualize_league(self):
        """Create and display the league visualization."""
        # Get sorted player indices
        sorted_indices = self.get_sorted_player_indices()
        sorted_players = [self.players[i] for i in sorted_indices]
        
        # Reorder results and victory points based on sorting
        sorted_results = self.results[sorted_indices][:, sorted_indices]
        sorted_victory_points = self.victory_points[sorted_indices]
        
        # Set color scheme based on block type
        if self.block_type == "Alpha":
            primary_color = '#00FF00'  # Bright Green
            frame_color = '#FF0000'    # Red frame
            text_color = '#000000'     # Black
            bg_color = '#FFFFFF'       # White
        else:  # Bravo
            primary_color = '#0000FF'  # Blue
            frame_color = '#0000FF'    # Blue frame
            text_color = '#000000'     # Black
            bg_color = '#FFFFFF'       # White
            
        # Create figure and axis
        fig, ax = plt.subplots(figsize=(14, 10))
        fig.patch.set_facecolor(bg_color)
        ax.set_facecolor(bg_color)
        
        # Set font family
        plt.rcParams['font.family'] = 'Capture it'
        
        # Create the grid
        for i in range(self.num_players + 1):
            ax.axhline(y=i, color='#000000', linestyle='-', linewidth=0.5)
            ax.axvline(x=i, color='#000000', linestyle='-', linewidth=0.5)
        # Plot results and diagonal blocks
        for i in range(self.num_players):
            for j in range(self.num_players):
                if i == j:
                    # Block out diagonal cells
                    ax.add_patch(plt.Rectangle((j, self.num_players-1-i), 1, 1,
                                             facecolor='#CCCCCC', edgecolor='#000000'))
                else:
                    result = sorted_results[i, j]
                    score = self.scores[sorted_indices[i], sorted_indices[j]]
                    
                    if result is not None:
                        # Calculate center position for the marker
                        center_x = j + 0.5
                        center_y = self.num_players - 1 - i + 0.5
                        
                        if result == 'W':
                            image = self.star_image
                            marker_size = 0.7  # Size relative to cell
                        elif result == 'L':
                            image = self.skull_image
                            marker_size = 0.6  # Size relative to cell
                        else:  # Draw
                            # Draw a horizontal line for draws
                            ax.plot([j + 0.2, j + 0.8], 
                                  [center_y, center_y],
                                  color=primary_color, linewidth=2)
                            continue
                            
                        if result in ['W', 'L']:
                            # Convert PIL image to numpy array for matplotlib
                            image_array = np.array(image)
                            
                            # Calculate image size maintaining aspect ratio
                            img_height, img_width = image_array.shape[:2]
                            aspect_ratio = img_width / img_height
                            
                            if aspect_ratio > 1:
                                # Width is larger
                                width = marker_size
                                height = marker_size / aspect_ratio
                            else:
                                # Height is larger
                                height = marker_size
                                width = marker_size * aspect_ratio
                            
                            # Calculate image extent based on marker size
                            extent = [
                                center_x - width/2,   # left
                                center_x + width/2,   # right
                                center_y - height/2,  # bottom
                                center_y + height/2   # top
                            ]
                            
                            # Display the image
                            ax.imshow(image_array, extent=extent, 
                                    interpolation='antialiased',
                                    zorder=2)
                        
                        # Add score if present
                        if score is not None:
                            y_offset = 0.2  # Offset to not overlap with marker
                            ax.text(center_x, center_y - y_offset, 
                                  f'{score:.1f}',
                                  ha='center', va='center',
                                  color=text_color, fontsize=12)
                        
                        # Add score if present
                        if score is not None:
                            y_offset = 0.2  # Offset to not overlap with marker
                            ax.text(center_x, center_y - y_offset, 
                                  f'{score:.1f}',
                                  ha='center', va='center',
                                  color=text_color, fontsize=8)
        
        # Add player names, points, and colored blocks
        for i, player in enumerate(sorted_players):
            orig_idx = self.players.index(player)
            points = self.calculate_points(self.results[orig_idx])
            
            # Add colored block for player row
            ax.add_patch(plt.Rectangle((-2, self.num_players-1-i), 2, 1,
                                     facecolor=frame_color, edgecolor='#000000'))
            
            # Player names above score text (white text on colored background)
            ax.text(-1.0, self.num_players-1-i+0.7, f"{player}",
                   ha='center', va='center', color='white',
                   fontweight='bold', fontsize=14, fontname='Capture it')
            
            # Display points and victory points in brackets below name
            score_text = f"({points}pts)({sorted_victory_points[i]}vp)"
            ax.text(-1.0, self.num_players-1-i+0.3, score_text,
                   ha='center', va='center', color='white',
                   fontweight='bold', fontsize=14, fontname='Capture it')
            
            # Player names on top
            ax.text(i+0.5, self.num_players+0.2, player,
                   ha='center', va='bottom', rotation=45,
                   color=text_color, fontweight='bold', fontsize=14,
                   fontname='Capture it')
        
        # Add block label
        plt.text(-1.5, self.num_players+0.5, f"{self.block_type} BLOCK",
                fontsize=18, fontweight='bold', color=text_color,
                fontname='Capture it')
        
        # Add "SCORE" label
        plt.text(-1.0, self.num_players+0.2, "SCORE",
                fontsize=14, fontweight='bold', color=text_color,
                ha='center', fontname='Capture it')
        
        # Set axis limits and remove ticks
        ax.set_xlim(-2, self.num_players)
        ax.set_ylim(-0.5, self.num_players + 1)
        ax.set_xticks([])
        ax.set_yticks([])
        
        # Remove axis lines
        for spine in ax.spines.values():
            spine.set_visible(False)
        
        plt.tight_layout()
        return fig

# Example usage with match results
if __name__ == "__main__":
    # Alpha Block
    alpha_players = ["Jackson", "Green", "Day", "Worgan", "Allcut", "Crockwell", "Jasper"]
    alpha_league = KillTeamLeague(alpha_players, "Alpha")
    # Add example match
    alpha_league.add_result("Allcut", "Green", "W")
    alpha_league.add_result("Green", "Allcut", "L")
    alpha_league.add_result("Day", "Crockwell", "W")
    alpha_league.add_result("Crockwell", "Day", "L")
    alpha_league.add_result("Green", "Day", "L")
    alpha_league.add_result("Day", "Green", "W")
    alpha_league.add_result("Worgan", "Allcut", "W")
    alpha_league.add_result("Allcut", "Worgan", "L")
    alpha_league.add_result("Crockwell", "Jasper", "W")
    alpha_league.add_result("Jasper", "Crockwell", "L")
    alpha_league.add_result("Worgan", "Green", "W")
    alpha_league.add_result("Green", "Worgan", "L")
    
    
    # Add some example victory points
    alpha_league.victory_points[2] = 33  # Day's VP
    alpha_league.victory_points[5] = 28  # Crockwell's VP
    alpha_league.victory_points[4] = 29  # Allcuts's VP
    alpha_league.victory_points[1] = 24  # Green's VP
    alpha_league.victory_points[3] = 35  # Worgan's VP
    alpha_league.victory_points[6] = 13  # Jasper's VP
    
    # Bravo Block
    bravo_players = ["Quy", "Ambrose", "Kompart", "Dunleavy", "Parrot", "Hodgson", "Charlie"]
    bravo_league = KillTeamLeague(bravo_players, "Bravo")
    # Add example match
    bravo_league.add_result("Hodgson", "Ambrose", "L")
    bravo_league.add_result("Ambrose", "Hodgson", "W")
    bravo_league.add_result("Parrot", "Charlie", "W")
    bravo_league.add_result("Charlie", "Parrot", "L")
    bravo_league.add_result("Dunleavy", "Charlie", "W")
    bravo_league.add_result("Charlie", "Dunleavy", "L")
    bravo_league.add_result("Parrot", "Kompart", "W")
    bravo_league.add_result("Kompart", "Parrot", "L")
    bravo_league.add_result("Quy", "Ambrose", "L")
    bravo_league.add_result("Ambrose", "Quy", "W")
    bravo_league.add_result("Dunleavy", "Ambrose", "W")
    bravo_league.add_result("Ambrose", "Dunleavy", "L")
    bravo_league.add_result("Quy", "Kompart", "W")
    bravo_league.add_result("Kompart", "Quy", "L")

    # Add some example victory points
    bravo_league.victory_points[0] = 26  # Ambrose's VP
    bravo_league.victory_points[1] = 45  # Ambrose's VP
    bravo_league.victory_points[5] = 4   # Hodgson's VP
    bravo_league.victory_points[4] = 38  # Parrots's VP
    bravo_league.victory_points[6] = 28  # Charlie's VP
    bravo_league.victory_points[3] = 27  #Dun's
    bravo_league.victory_points[2] = 23  #Max
    
    
    # Create visualizations
    alpha_fig = alpha_league.visualize_league()
    alpha_fig.savefig('alpha_block_results.png', bbox_inches='tight', dpi=300)
    
    bravo_fig = bravo_league.visualize_league()
    bravo_fig.savefig('bravo_block_results.png', bbox_inches='tight', dpi=300)
    
    plt.show()