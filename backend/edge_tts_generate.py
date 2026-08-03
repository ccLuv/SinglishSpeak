"""Generate one MP3 file with Microsoft Edge online voices."""

import argparse
import asyncio
from pathlib import Path

import edge_tts


async def generate(text: str, voice: str, rate: str, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary_output = output.with_suffix(output.suffix + ".tmp")

    try:
        communicator = edge_tts.Communicate(text=text, voice=voice, rate=rate)
        await communicator.save(str(temporary_output))
        temporary_output.replace(output)
    finally:
        if temporary_output.exists():
            temporary_output.unlink()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True)
    parser.add_argument("--voice", required=True)
    parser.add_argument("--rate", default="-10%")
    parser.add_argument("--output", required=True, type=Path)
    arguments = parser.parse_args()

    asyncio.run(
        generate(
            text=arguments.text,
            voice=arguments.voice,
            rate=arguments.rate,
            output=arguments.output,
        )
    )


if __name__ == "__main__":
    main()
