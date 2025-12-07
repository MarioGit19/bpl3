#!/bin/bash
set -e

# Compile and run the test
cd ../..
bun index.ts example/std_lib_demo/std_lib_demo.x -r
