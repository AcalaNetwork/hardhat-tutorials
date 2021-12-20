#!/bin/bash

failed=0

build_all() {
  sh -c 'rush build \
    -t hardhat-tutorial-hello-world \
    -t hardhat-tutorial-echo \
    -t hardhat-tutorial-token \
    -t hardhat-tutorial-nft'
}

rebuild_all() {
  sh -c 'rush rebuild \
    -t hardhat-tutorial-hello-world \
    -t hardhat-tutorial-echo \
    -t hardhat-tutorial-token \
    -t hardhat-tutorial-nft'
}

test_all() {
  examples=(
    "hello-world"
    "echo"
    "token"
    "nft"
  )

  ROOT=$(pwd)

  for e in "${examples[@]}"
  do
    echo "--------------- testing hardhat ${e} ---------------"

    cd  "${ROOT}/${e}"

    if ! yarn test-mandala; then
      ((failed=failed+1))
    fi

    echo ""
  done

  echo "+++++++++++++++++++++++"
  echo "hardhat test failed: $failed"
  echo "+++++++++++++++++++++++"
}

build_and_test() {
  build_all
  test_all

  exit $failed
}

case "$1" in
  "build") build_all ;;
  "rebuild") rebuild_all ;;
  "test") test_all ;;
  "build_and_test") build_and_test ;;
  *) build_and_test ;;
esac
