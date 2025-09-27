import random

class PlaygroundGame:
    def __init__(self, title):
        self.title = title
        self.is_running = False
        self.ohis = 0

    def start(self):
        if not self.is_running:
            self.is_running = True
            print(f"{self.title} has started!")
            self.play()
        else:
            print(f"{self.title} is already running.")

    def stop(self):
        if self.is_running:
            self.is_running = False
            print(f"{self.title} has stopped.")
        else:
            print(f"{self.title} is not running.")

    def play(self):
        print("Try to sneak and slide past the guard!")
        while self.is_running:
            action = input("Type 'slide' to try sliding, or 'quit' to stop: ").strip().lower()
            if action == 'slide':
                if random.random() < 0.7:  # 70% chance to succeed
                    self.ohis += 5000
                    print(f"Success! You earned 5000 OHIS. Total OHIS: {self.ohis}")
                else:
                    print("Caught by the guard! No OHIS earned this time.")
            elif action == 'quit':
                self.stop()
            else:
                print("Invalid action. Try again.")

if __name__ == "__main__":
    game = PlaygroundGame("Sneak & Slide Playground")
    game.start()