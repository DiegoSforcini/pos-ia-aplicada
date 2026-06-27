source .env

API_URL="https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_SITE_NAME="My Example"

NLP_MODEL="google/gemma-3-27b-it:free"

curl --silent -X POST "$API_URL" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $OPENROUTER_API_KEY" \
-H "HTTP-Referer: $OPENROUTER_SITE_URL" \
-H "X-Title: $OPENROUTER_SITE_NAME" \
-d '
    {
        "model": '"'$NLP_MODEL'"',
        "messages": [
            {
                "role":"user",
                "content":"Me conte uma curiosidade sobre LLMs"
            }
        ],
        "temperature": 0.3,
        "max_tokens": 1000
}' | jq

# {
#   "id": "gen-1773237001-NEztcPrHDMAKyVMp0X1V",
#   "object": "chat.completion",
#   "created": 1773237001,
#   "model": "google/gemma-3-27b-it:free",
#   "provider": "Google AI Studio",
#   "system_fingerprint": null,
#   "choices": [
#     {
#       "index": 0,
#       "logprobs": null,
#       "finish_reason": "stop",
#       "native_finish_reason": "STOP",
#       "message": {
#         "role": "assistant",
#         "content": "Uma curiosidade fascinante sobre os LLMs (Large Language Models, ou Grandes Modelos de Linguagem) é que eles **não \"pensam\" ou \"entendem\" como humanos**. Apesar de serem capazes de gerar textos incrivelmente coerentes e responder a perguntas de forma convincente, eles funcionam essencialmente como **máquinas de predição de palavras**.\n\nO que acontece é que esses modelos são treinados em quantidades massivas de texto, aprendendo a probabilidade de uma palavra aparecer após outra. Quando você faz uma pergunta, o LLM analisa a entrada e, com base nos padrões que aprendeu, prevê a sequência de palavras mais provável para responder.\n\n**Em outras palavras, eles são mestres em identificar e replicar padrões estatísticos na linguagem, mas não possuem consciência, crenças ou compreensão real do mundo.**\n\nIsso pode levar a situações engraçadas ou até preocupantes, onde o modelo gera respostas que parecem inteligentes, mas são logicamente inconsistentes ou factualmente incorretas. É por isso que é importante sempre verificar as informações fornecidas por um LLM, especialmente em contextos críticos.\n\nEssa característica também é o que impulsiona a pesquisa em torno de LLMs, buscando formas de torná-los mais confiáveis, precisos e alinhados com os valores humanos.\n",
#         "refusal": null,
#         "reasoning": null
#       }
#     }
#   ],
#   "usage": {
#     "prompt_tokens": 9,
#     "completion_tokens": 0,
#     "total_tokens": 9,
#     "cost": 0,
#     "is_byok": false,
#     "prompt_tokens_details": {
#       "cached_tokens": 0,
#       "cache_write_tokens": 0,
#       "audio_tokens": 0,
#       "video_tokens": 0
#     },
#     "cost_details": {
#       "upstream_inference_cost": 0,
#       "upstream_inference_prompt_cost": 0,
#       "upstream_inference_completions_cost": 0
#     },
#     "completion_tokens_details": {
#       "reasoning_tokens": 0,
#       "image_tokens": 0,
#       "audio_tokens": 0
#     }
#   }
# }