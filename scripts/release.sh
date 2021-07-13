DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

cd $DIR/../core && yarn run release &&
cd $DIR/../server && yarn run release &&
cd $DIR/../web-client && yarn run release

