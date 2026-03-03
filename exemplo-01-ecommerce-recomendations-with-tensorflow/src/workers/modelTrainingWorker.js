import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
import { workerEvents } from '../events/constants.js';

console.log('Model training worker initialized');
let _globalCtx = {};
let _model = null;

const WEIGHTS = {
    category: 0.4,
    color: 0.3,
    price: 0.2,
    age: 0.1,
}

/**
 * Normalize continuous values (proce, age) to 0-1 range
 * Why? Keeps all features balanced so no one dominates training
 * Formula: (val - min) / (max - min)
 * Example: price=129.99, minPrice=39.99, maxPrice=199.99 => (129.99 - 39.99) / (199.99 - 39.99) = 0.5625
 */
const normalize = (val, min, max) => (val - min) / ((max - min) || 1);

function makeContext(products, users) {
    const ages = users.map(u => u.age);
    const prices = products.map(p => p.price);

    const minAge = Math.min(...ages);
    const maxAge = Math.max(...ages);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const colors = [...new Set(products.map(p => p.color))];
    const categories = [...new Set(products.map(p => p.category))];

    const colorsIndex = Object.fromEntries(colors.map((color, index) => {
        return [color, index];
    }));

    const categoriesIndex = Object.fromEntries(categories.map((category, index) => {
        return [category, index];
    }));

    /**
     * computar a média de idade doscompradores por produto (ajuda a personalizar recomendações)
     */
    const midAge = (minAge + maxAge) / 2;
    const ageSums = {}
    const ageCounts = {}

    users.forEach(user => {
        user.purchases.forEach(productId => {
            ageSums[productId.name] = (ageSums[productId.name] || 0) + user.age;
            ageCounts[productId.name] = (ageCounts[productId.name] || 0) + 1;
        });
    })

    const productAvgAgeNorm = Object.fromEntries(
        products.map(product => {
            const avg = ageCounts[product.name] ? ageSums[product.name] / ageCounts[product.name] : midAge;
            return [product.name, normalize(avg, minAge, maxAge)];
        })
    )

    return {
        products,
        users,
        colorsIndex,
        categoriesIndex,
        minAge,
        maxAge,
        minPrice,
        maxPrice,
        numCategories: categories.length,
        numColors: colors.length,
        dimentions: 2 + categories.length + colors.length, // price + age + colors + categories
        productAvgAgeNorm
    }
}

const oneHotWeighted = (index, length, weight) => tf.oneHot(index, length).cast('float32').mul(weight);

function encodeProduct(product, context) {
    // normalizando dados para ficar de 0 a 1 e aplicar o peso na recomendação

    const price = tf.tensor1d([
        normalize(product.price, context.minPrice, context.maxPrice) * WEIGHTS.price
    ]);

    const age = tf.tensor1d([
        (context.productAvgAgeNorm[product.name] ?? 0.5) * WEIGHTS.age
    ]);

    const category = oneHotWeighted(
        context.categoriesIndex[product.category],
        context.numCategories,
        WEIGHTS.category
    );

    const color = oneHotWeighted(
        context.colorsIndex[product.color],
        context.numColors,
        WEIGHTS.color
    );

    return tf.concat1d([price, age, category, color]);
}

function encodeUser(user, context) {
    if (user.purchases.length) {
        return tf.stack(
            user.purchases.map(
                product => encodeProduct(product, context)
            ))
            .mean(0) // média dos vetores dos produtos comprados para representar o usuário
            .reshape([1, context.dimentions]); // reshape para manter formato consistente (1, n)
    }

    return tf.concat1d([
        tf.zeros([1]),
        tf.tensor1d([normalize(user.age, context.minAge, context.maxAge) * WEIGHTS.age]),
        tf.zeros([context.numCategories]), // categoria ignorada
        tf.zeros([context.numColors]) // cor ignorada
    ]).reshape([1, context.dimentions]);
}

function createTrainingData(context) {
    const inputs = [];
    const labels = [];
    context.users
        .filter(user => user.purchases.length) // considerar apenas usuários com histórico de compras para garantir vetores de usuário significativos
        .forEach(user => {
            const userVector = encodeUser(user, context).dataSync(); // convertendo tensor para array normal para facilitar uso posterior
            context.products.forEach(product => {
                const productVector = encodeProduct(product, context).dataSync(); // convertendo tensor para array normal para facilitar uso posterior
                const label = user.purchases.some(p => p.name === product.name) ? 1 : 0; // 1 se comprou, 0 se não comprou

                //combinar o user + product
                inputs.push([...userVector, ...productVector]);
                labels.push(label);
            })
        });

    return {
        xs: tf.tensor2d(inputs),
        ys: tf.tensor2d(labels, [labels.length, 1]),
        inputDimention: context.dimentions * 2 // user vector + product vector (tamanho = userVector + productVector)
    }
}

async function configureNeuralNetAndTrain(trainData) {
    const model = tf.sequential();

    /**
     * Camada de entrada
     * - inputShape: Número de features por exemplo de treino (trainData.inputDimention). Exemplo: Se o vetor produto + usuário = 20 números, então inputDimention = 20
     * - units: 128 neurônios (muitos "olhos" para detectar padrões complexos)
     * - activation: 'relu' (mantém apenas sinais positivos, ajuda a rede a aprender relações não lineares)
     */

    model.add(tf.layers.dense({
        inputShape: [trainData.inputDimention],
        units: 128,
        activation: 'relu'
    }));

    /**
     * Camada oculta 1
     * - 64 neurônios (reduzindo de 128 para 64 para forçar a rede a aprender representações mais compactas.) (Menos que a primeira camada: começa a comprimir informação)
     * - activation: 'relu' (continua ajudando a rede a aprender relações não lineares, essencial para capturar padrões complexos entre características do produto e preferências do usuário. 
     * Ainda extraindo combinações relevantes de features, mas de forma mais refinada)
     */
    model.add(tf.layers.dense({
        units: 64,
        activation: 'relu'
    }));

    /**
     * Camada oculta 2
     * - 32 neurônios (redução adicional para forçar a rede a focar nas características mais importantes. Menos que a camada anterior: continua a compressão, forçando a rede a aprender as interações mais cruciais entre as features.) (Mais estreita de novo, destilando as informações mais importantes). Exemplo: De muitos sinais, mantém apenas os padrões mais fortes e relevantes para a recomendação
     * - activation: 'relu' (mantém a capacidade de aprender relações não lineares, essencial para capturar as interações complexas entre as características do produto e as preferências do usuário.) (Continua extraindo combinações relevantes de features, mas de forma ainda mais refinada, focando nas interações mais importantes)
     */
    model.add(tf.layers.dense({
        units: 32,
        activation: 'relu'
    }));

    /**
     * Camada de saída
     * - 1 neurônio (saída única representando a probabilidade de compra) (porque vamos retornar apenas uma pontuação de recomendação)
     * - activation: 'sigmoid' (transforma a saída em um valor entre 0 e 1, interpretado como a probabilidade de o usuário comprar o produto. Exemplo: Se a saída for 0.8, isso significa que o modelo estima que há uma probabilidade de 80% de o usuário comprar aquele produto.)
     */
    model.add(tf.layers.dense({
        units: 1,
        activation: 'sigmoid' // saída entre 0 e 1, representando a probabilidade de compra
    }));

    model.compile({
        optimizer: tf.train.adam(0.01), // algoritmo de otimização eficiente para redes neurais
        loss: 'binaryCrossentropy', // função de perda adequada para classificação binária (comprou ou não comprou)
        metrics: ['accuracy'] // métrica para avaliar o desempenho do modelo durante o treinamento
    });

    await model.fit(trainData.xs, trainData.ys, {
        epochs: 100, // número de vezes que o modelo verá todo o conjunto de dados de treinamento (mais épocas podem levar a um modelo mais preciso, mas cuidado com overfitting)
        batchSize: 32, // número de exemplos que o modelo processará antes de atualizar os pesos (ajuda a estabilizar o treinamento e pode acelerar a convergência)
        shuffle: true, // embaralha os dados a cada época para evitar que o modelo aprenda padrões baseados na ordem dos dados
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                postMessage({
                    type: workerEvents.trainingLog,
                    epoch,
                    loss: logs.loss,
                    accuracy: logs.acc
                });
            }
        }
    });

    return model;
}

async function trainModel({ users }) {
    console.log('Training model with users:', users)

    const products = await fetch('/data/products.json').then(res => res.json());

    const context = makeContext(products, users);
    context.productVectors = products.map(product => {
        return {
            name: product.name,
            meta: { ...product },
            vector: encodeProduct(product, context).dataSync() // convertendo tensor para array normal para facilitar uso posterior
        }
    })

    _globalCtx = context;

    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 50 } });
    postMessage({
        type: workerEvents.trainingLog,
        epoch: 1,
        loss: 1,
        accuracy: 1
    });

    const trainData = createTrainingData(context);
    _model = await configureNeuralNetAndTrain(trainData);

    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 100 } });
    postMessage({ type: workerEvents.trainingComplete });


}
function recommend(user, ctx) {
    if (!_model) return;
    const context = _globalCtx;

    /**
     * Converta o usuário fornecido no vetor de features codificadas
     * (preço ignorado, idade normalizada, categoria ignoradas)
     * Isso transforma as informações do usuário no mesmo formato númerico que foi usado para treinar o modelo.
     */
    const userVector = encodeUser(user, ctx).dataSync(); // convertendo tensor para array normal para facilitar uso posterior

    /**
     * Em aplicações reais:
     * Armazenar todos os valores de produtos em um banco de dados vetorial (como Posgres, Neo4j, Pinecone) para recuperação rápida usando similaridade de cosseno ou distância euclidiana.
     * Consulta: Encontrar os 200 produtos mais próximos do vetor do usuário.
     * Execute _model.predict() apenas nesses 200 produtos para eficiência.
     * 
     * Crie pares de entrada: para cada produto, concatene o vetor do usuário com o vetor codificado do produto.
     * Porque? O modelo prevê o "score de compatibilidade" para cada poar (usuário, produto).
     */
    const inputs = context.productVectors.map(({vector}) => {
        return [...userVector, ...vector]; // combinando vetor do usuário com vetor de cada produto para criar a entrada para o modelo
    })

    /**
     * Criar um tensor 2D onde cada linha é a combinação do vetor do usuário com o vetor de um produto específico.
      - shape: [numProdutos, userVector.length + productVector.length]
      - Exemplo: Se temos 100 produtos e cada vetor (usuário + produto) tem 20 números, o tensor terá forma [100, 20].
     * Isso permite que o modelo processe todos os produtos de uma vez, calculando a pontuação de recomendação para cada produto em relação ao usuário.
     */
    const inputTensor = tf.tensor2d(inputs);
    
    /**
     * Executar a previsão usando o modelo treinado. O modelo processará cada linha do tensor de entrada (cada combinação usuário-produto) e retornará uma pontuação de recomendação para cada produto.
      - A saída será um tensor 2D com forma [numProdutos, 1], onde cada valor representa a probabilidade de o usuário comprar aquele produto específico.
       - Exemplo: Se temos 100 produtos, a saída terá forma [100, 1], com cada valor entre 0 e 1 indicando a força da recomendação para cada produto.
     * Essas pontuações podem então ser usadas para classificar os produtos e recomendar os mais relevantes para o usuário.
     */
    const predictions = _model.predict(inputTensor); // obtendo as pontuações de recomendação para cada produto

    /**
     * Converter o tensor de previsões em um array normal para facilitar a manipulação e classificação dos produtos com base nas pontuações de recomendação.
      - predictions.dataSync() retorna um array de números representando as pontuações de recomendação para cada produto.
       - Exemplo: Se temos 100 produtos, o array terá 100 valores, cada um indicando a força da recomendação para aquele produto específico.
     * Com essas pontuações, podemos classificar os produtos e selecionar os mais relevantes para recomendar ao usuário.
      - Exemplo: Ordenar os produtos com base nas pontuações e recomendar os top 5 produtos com as maiores pontuações.
      - Isso permite que o sistema de recomendação ofereça sugestões personalizadas com base nas preferências do usuário e nas características dos produtos.
     */
    const scores = predictions.dataSync(); // convertendo tensor de previsões para array normal

    const recommendations = context.productVectors.map((item, index) => {
        return {
            ...item.meta,
            name: item.name,
            score: scores[index] // previsão do modelo para este produto específico, indicando a força da recomendação para o usuário
        }
    });

    const sortedItems = recommendations
    .sort((a, b) => b.score - a.score) // ordenando produtos por pontuação de recomendação (do mais relevante para o menos relevante)
    // .slice(0, 5); // selecionando os top 5 produtos para recomendar

    /**
     * Envia a lista ordenada de producots recomendados para thread principal(a UI pode usar essa lista para mostrar as recomendações ao usuário)
     */
    postMessage({
        type: workerEvents.recommend,
        user,
        recommendations: sortedItems
    });
}


const handlers = {
    [workerEvents.trainModel]: trainModel,
    [workerEvents.recommend]: d => recommend(d.user, _globalCtx),
};

self.onmessage = e => {
    const { action, ...data } = e.data;
    if (handlers[action]) handlers[action](data);
};
