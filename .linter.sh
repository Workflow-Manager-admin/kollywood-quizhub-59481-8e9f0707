#!/bin/bash
cd /home/kavia/workspace/code-generation/kollywood-quizhub-59481-8e9f0707/kollywood_quizhub
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

