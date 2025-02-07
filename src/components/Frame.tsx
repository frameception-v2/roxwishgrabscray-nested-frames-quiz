"use client";

import { useEffect, useCallback, useState } from "react";
import sdk, {
  AddFrame,
  SignIn as SignInCore,
  type Context,
} from "@farcaster/frame-sdk";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card";
import { PurpleButton } from "~/components/ui/PurpleButton";
import { config } from "~/components/providers/WagmiProvider";
import { truncateAddress } from "~/lib/truncateAddress";
import { base, optimism } from "wagmi/chains";
import { useSession } from "next-auth/react";
import { createStore } from "mipd";
import { Label } from "~/components/ui/label";
import { PROJECT_TITLE } from "~/lib/constants";

function QuizCard({ question, options, explanation, isCorrect, onAnswer }: { 
  question: string,
  options: string[],
  explanation: string,
  isCorrect?: boolean,
  onAnswer: (index: number) => void 
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{question}</CardTitle>
        <CardDescription>Choose the correct answer:</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {options.map((option, index) => (
          <PurpleButton 
            key={index}
            onClick={() => onAnswer(index)}
            disabled={typeof isCorrect !== 'undefined'}
            className={typeof isCorrect !== 'undefined' 
              ? index === isCorrect 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-red-500 hover:bg-red-600'
              : ''}
          >
            {option}
          </PurpleButton>
        ))}
        {typeof isCorrect !== 'undefined' && (
          <div className="mt-4 p-2 bg-gray-100 rounded">
            <Label>{explanation}</Label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Frame() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<Context.FrameContext>();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);

  const [added, setAdded] = useState(false);

  const [addFrameResult, setAddFrameResult] = useState("");

  const addFrame = useCallback(async () => {
    try {
      await sdk.actions.addFrame();
    } catch (error) {
      if (error instanceof AddFrame.RejectedByUser) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      if (error instanceof AddFrame.InvalidDomainManifest) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      setAddFrameResult(`Error: ${error}`);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const context = await sdk.context;
      if (!context) {
        return;
      }

      setContext(context);
      setAdded(context.client.added);

      // If frame isn't already added, prompt user to add it
      if (!context.client.added) {
        addFrame();
      }

      sdk.on("frameAdded", ({ notificationDetails }) => {
        setAdded(true);
      });

      sdk.on("frameAddRejected", ({ reason }) => {
        console.log("frameAddRejected", reason);
      });

      sdk.on("frameRemoved", () => {
        console.log("frameRemoved");
        setAdded(false);
      });

      sdk.on("notificationsEnabled", ({ notificationDetails }) => {
        console.log("notificationsEnabled", notificationDetails);
      });
      sdk.on("notificationsDisabled", () => {
        console.log("notificationsDisabled");
      });

      sdk.on("primaryButtonClicked", () => {
        console.log("primaryButtonClicked");
      });

      console.log("Calling ready");
      sdk.actions.ready({});

      // Set up a MIPD Store, and request Providers.
      const store = createStore();

      // Subscribe to the MIPD Store.
      store.subscribe((providerDetails) => {
        console.log("PROVIDER DETAILS", providerDetails);
        // => [EIP6963ProviderDetail, EIP6963ProviderDetail, ...]
      });
    };
    if (sdk && !isSDKLoaded) {
      console.log("Calling load");
      setIsSDKLoaded(true);
      load();
      return () => {
        sdk.removeAllListeners();
      };
    }
  }, [isSDKLoaded, addFrame]);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      <div className="w-[300px] mx-auto py-2 px-2">
        <h1 className="text-2xl font-bold text-center mb-4 text-gray-700 dark:text-gray-300">
          {PROJECT_TITLE}
        </h1>
        {!showResults ? (
          <QuizCard
            question={QUIZ_QUESTIONS[currentQuestionIndex].question}
            options={QUIZ_QUESTIONS[currentQuestionIndex].options}
            explanation={QUIZ_QUESTIONS[currentQuestionIndex].explanation}
            isCorrect={
              selectedAnswers[currentQuestionIndex] !== undefined
                ? QUIZ_QUESTIONS[currentQuestionIndex].correct
                : undefined
            }
            onAnswer={(answerIndex) => {
              const newAnswers = [...selectedAnswers];
              newAnswers[currentQuestionIndex] = answerIndex;
              setSelectedAnswers(newAnswers);
              
              if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
                setTimeout(() => {
                  setCurrentQuestionIndex(prev => prev + 1);
                }, 2000);
              } else {
                setTimeout(() => setShowResults(true), 2000);
              }
            }}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Quiz Complete!</CardTitle>
            </CardHeader>
            <CardContent>
              <Label>
                Score: {selectedAnswers.filter((ans, i) => ans === QUIZ_QUESTIONS[i].correct).length}/
                {QUIZ_QUESTIONS.length}
              </Label>
              <PurpleButton 
                className="mt-4"
                onClick={() => {
                  setCurrentQuestionIndex(0);
                  setSelectedAnswers([]);
                  setShowResults(false);
                }}
              >
                Restart Quiz
              </PurpleButton>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
