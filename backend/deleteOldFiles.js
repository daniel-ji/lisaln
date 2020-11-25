const cron = require('node-cron');
const fs = require('fs');
const blacklist = [
    'sdf_contactmap',
    'clustalo-',
    'upload contents',
    '_blastp_landmark.txt',
    '_blastp_landmark.fasta.txt',
    '_blastp_landmark_alnh_',
    '_blastp_landmark_human',
    '_blastp_landmark_spec',
    '_landmark_homolo_aln',
    '_landmark_homolo.fasta.txt'
]
const whitelist = [
    "NCBI_blast",
    "seq_align_check",
    "nohup.out",
    "sequence_download",
    "back",
    "bin_plot",
    "blast_merge",
    "blast_trim",
    "blastp_display",
    "blastp_display_more",
    "chembl",
    "clustal_identity",
    "clustal_seq_align",
    "clustalo_lwp.pl",
    "cluster",
    "CSV_getCol",
    "do_gnuplot",
    "fasta_counts",
    "fasta_getNth",
    "fasta_merge_species",
    "fasta_removeblank",
    "fasta_removedup",
    "get",
    "gnuplot_dendogram",
    "gnuplot_LisAln",
    "GO_annotation",
    "html_removebracket",
    "human_domain.xls",
    "human_GO.xls",
    "human_pathway.xls",
    "human_uniprot.xls",
    "image_manipulate",
    "KEGG_pathway",
    "linear_regression",
    "list_mergeTwo",
    "lists_compare_different",
    "mapfile_addpad",
    "movie_manuplate",
    "mutation_check",
    "NCBI_blast_PDBs",
    "NCBI_homoloGene",
    "Net-SSLeay-1.88.tar.gz",
    "pdb_download",
    "pdb_renumber_residue",
    "pdb_returnChain",
    "Pfam_domain",
    "phylotree_convert",
    "protein_fasta_refseq_convert",
    "pymol_all",
    "sdf_contactmap",
    "sdf_getFromName_many",
    "sdf_getName",
    "sdf_getNCompound",
    "sdf_getNthCompound",
    "sdf2images",
    "seq_align_rearrange",
    "sequence_search_SMART.pl",
    "similarity.spl",
    "species_change",
    "test.pl",
    "UniProt_get",
    "watermark",
    "web_blast.pl",
    "i.fasta.txt",
    "uniprot_sprot_202001.dat",
    "test.log",
    "species_mapping.txt",
    "symbol.txt",
    "uploads"
];

const cleanUp = () => {
    //every 1st and 15th, clear month old file
    cron.schedule('0 0 1,15 * *', () => {
        //remove old uploads
        fs.readdir('./dbandbash/codes/uploads', {withFileTypes: true}, (err, files) => {
            if (err === null) {
                files.forEach((file) => {
                    const stats = fs.statSync('./dbandbash/codes/uploads/' + file.name);
                    if ((new Date().getTime() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24) > 30) {
                        fs.unlink('./dbandbash/codes/uploads/' + file.name, err => console.log(err))
                    }
                })
            }
        })
        fs.readdir('./dbandbash/codes', {withFileTypes: true}, (err, files) => {
            if (err === null) {
                files.forEach(file => {
                    const stats = fs.statSync('./dbandbash/codes/' + file.name);
                    if (!whitelist.includes(file.name) && (new Date().getTime() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24) > 30) {
                        fs.unlink('./dbandbash/codes/' + file.name, err => console.log(err));
                    }
                })
            }
        })
    });
}

exports.cleanUp = cleanUp;
