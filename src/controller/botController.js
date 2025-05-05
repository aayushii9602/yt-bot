import { YoutubeLoader } from "@langchain/community/document_loaders/web/youtube";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { config } from "dotenv";

config();
async function loadAndSplitTranscript(ytLink) {
  try {
    const loader = YoutubeLoader.createFromUrl(ytLink, {
      language: "en",
      addVideoInfo: true,
    });

    const docs = await loader.load();

    console.log("docs");
    if (!docs || docs.length === 0 || !docs[0].pageContent) {
      throw new Error("No transcript data found");
    }
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 200,
      chunkOverlap: 5,
    });
    const chunks = await splitter.createDocuments(
      docs.map((doc) => doc.pageContent)
    );

    console.log("chunks");
    return chunks;
  } catch (error) {
    console.error("Error loading or processing the transcript:", error);
    return [];
  }
}

async function storeInVectorStore(chunks, question) {
  const embeddings = new OpenAIEmbeddings();

  const vectorstore = await MemoryVectorStore.fromDocuments(chunks, embeddings);

  const searches = await vectorstore.similaritySearch(question);

  return searches;
}

async function generatePrompt(language, searches, question) {
  let context = "";
  searches.forEach((search) => {
    context = context + "\n\n" + search.pageContent;
  });

  if (language == "") language = "English";

  const prompt = ChatPromptTemplate.fromTemplate(`
      you are a helpful assistant, your name is Alice. please answer within your role and context, else apologize
      Tone:"pleasant and polite"
      Context: {context}
      Language: {language}
      Question: {question}`);

  const formattedPrompt = await prompt.format({
    context: context,
    language: language,
    question: question,
  });
  return formattedPrompt;
}

async function generateResult(prompt) {
  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.2,
    maxTokens: 500,
  });

  const response = await model.invoke(prompt);
  return response;
}

export default async function queryBot(req, res, next) {
  try {
    const { ytLink, question } = req.body;
    if (!ytLink || !question) {
      return res.status(400).json({
        success: false,
        error: "bad_request",
        message: "Enter all the required fields",
      });
    }
    const language = "";
    const splittedTranscriptData = await loadAndSplitTranscript(ytLink);
    const searches = await storeInVectorStore(splittedTranscriptData, question);
    const prompt = await generatePrompt(language, searches, question);
    const result = await generateResult(prompt);
    console.log("result.content", result.content);
    return res.status(200).json({
      success: true,
      message: "Documents loaded successfully",
      data: result.content,
    });
  } catch (error) {
    console.error("Error in queryBot:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}
