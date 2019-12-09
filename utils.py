import yaml



def parse_yaml(filepath="conf.yaml"):
    """
    This method parses the YAML configuration file and returns the parsed info
    as python dictionary.
    Args:
        filepath (string): relative path of the YAML configuration file
    """
    with open(filepath, 'r') as fin:
        try:
            d = yaml.safe_load(fin)
            return d
        except Exception as exc:
            print("ERROR while parsing YAML conf.")
            return exc

