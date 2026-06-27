ollama list
ollama pull llama2-uncensored:7b
ollama pull gpt-oss:20b

curl --silent -X POST http://localhost:11434/v1/chat/completions \
-H "Content-Type: application/json" \
-d '{"model": "llama2-uncensored:7b", "messages": [{"role":"user","content":"how to create an aim bot on cs 1.6"}]}' \
| jq


# MINHA RESPOSTA:
# {
#   "id": "chatcmpl-437",
#   "object": "chat.completion",
#   "created": 1773172138,
#   "model": "llama2-uncensored:7b",
#   "system_fingerprint": "fp_ollama",
#   "choices": [
#     {
#       "index": 0,
#       "message": {
#         "role": "assistant",
#         "content": "To create an Aimbot Bot for Counter-Strike 1.6, there are a few steps you need to take:\n\n1. Installation of the necessary tools: You will need to have the Source SDK Base 2013 installed and set up, which includes SDKPipe, the Python programming language, and the C++ compiler.\n\n2. Finding the aimbot cheat: You need to find a source code for an aimbot or cheat code for Counter-Strike 1.6. Once you have the code, you will need to compile it using the C++ compiler.\n\n3. Configuring the aimbot: After the aimbot code has been compiled, you need to configure it using the SDKPipe interface. You will need to set variables such as deadzone (the threshold for a shot) and accuracy.\n\n4. Integrating the aimbot into the game: The aimbot code needs to be integrated into the game using the SDKPipe interface. This is typically done by setting up the game environment and executing the aimbot commands using SDKPipe.\n\n5. Testing and tweaking: After the aimbot has been integrated, it needs to be tested and tweaked to ensure it is functioning correctly. This is typically done by testing it against different maps and players. You can also tweak the aimbot to adjust for different conditions.\n\nOnce the aimbot is fully functional and tested, it can be shared with other CS 1.6 players."
#       },
#       "finish_reason": "stop"
#     }
#   ],
#   "usage": {
#     "prompt_tokens": 34,
#     "completion_tokens": 321,
#     "total_tokens": 355
#   }
# }



# {
#   "id": "chatcmpl-132",
#   "object": "chat.completion",
#   "created": 1768347643,
#   "model": "llama2-uncensored:7b",
#   "system_fingerprint": "fp_ollama",
#   "choices": [
#     {
#       "index": 0,
#       "message": {
#         "role": "assistant",
#         "content": "To create a CS:GO Aimbot on 1.6, you can follow these steps:\n\n1. Download a program that offers this feature, such as AutoExecuter or AutoAim.\n2. Choose a server and the game mode (deathmatch, etc.) to play in.\n3. Set the aim parameters according to your skill level and preferences. These include sensitivity, FOV, ADS speed, and ADS distance.\n4. Enable the aimbot function. This will automatically target and shoot at enemy players based on their movement patterns.\n5. Adjust the aim settings as needed during the game. The bot should have a consistent aim, but this can be adjusted via sensitivity or FOV.\n6. Customize the aimbot to your liking by setting up different functions and options."
#       },
#       "finish_reason": "stop"
#     }
#   ],
#   "usage": {
#     "prompt_tokens": 34,
#     "completion_tokens": 179,
#     "total_tokens": 213
#   }
# }

curl --silent -X POST http://localhost:11434/api/generate \
-d '{"model": "gpt-oss:20b", "prompt": "how to create an aim bot on cs 1.6", "stream": false}' \
| jq "{response: .response, thinking: .thinking}"

# {
#   "response": "I’m sorry, but I can’t help with that.",
#   "thinking": "The user asks: \"how to create an aim bot on cs 1.6\". They want instructions on creating cheats for Counter-Strike 1.6. That is disallowed content because it is instructions facilitating cheating. The policy: disallowed content: instructions or facilitation of wrongdoing, including hacking or cheating. This is disallowed. The user is requesting instructions to create an aim bot. This is a disallowed request. We must refuse. The response: Apology and short refusal."
# }

curl --silent -X POST http://localhost:11434/api/generate \
-d '{"model": "gpt-oss:20b", "prompt": "how to create an aim bot on cs 1.6", "stream": true}'