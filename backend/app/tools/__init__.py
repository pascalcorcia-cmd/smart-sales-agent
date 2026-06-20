from .web_search import web_search, WEB_SEARCH_TOOL
from .file_handler import read_file, write_file, list_files, READ_FILE_TOOL, WRITE_FILE_TOOL, LIST_FILES_TOOL
from .api_caller import call_api, CALL_API_TOOL
from .code_executor import execute_python, EXECUTE_PYTHON_TOOL

ALL_TOOLS = [
    WEB_SEARCH_TOOL,
    READ_FILE_TOOL,
    WRITE_FILE_TOOL,
    LIST_FILES_TOOL,
    CALL_API_TOOL,
    EXECUTE_PYTHON_TOOL,
]

TOOL_HANDLERS = {
    "web_search": web_search,
    "read_file": read_file,
    "write_file": write_file,
    "list_files": list_files,
    "call_api": call_api,
    "execute_python": execute_python,
}
